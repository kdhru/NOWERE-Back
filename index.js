import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import passport from "passport";
import http from "http";
import { Server } from "socket.io";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import chatRoutes from "./router/chat.js";
import messageRoutes from "./router/messages.js";

dotenv.config();
await connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

/* =====================================
   SOCKET.IO
===================================== */

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

app.set("io", io);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  socket.on("join", (userId) => {
    if (!userId) return;
    onlineUsers.set(userId.toString(), socket.id);
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("send-message", (data) => {
    const receiverSocket = onlineUsers.get(data.receiverId?.toString());
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive-message", data);
    }
  });

  socket.on("typing", (data) => {
    const receiverSocket = onlineUsers.get(data.receiverId?.toString());
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { senderId: data.senderId });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }
    io.emit("online-users", Array.from(onlineUsers.keys()));
    console.log("Socket Disconnected:", socket.id);
  });
});

/* =====================================
   PASSPORT GOOGLE AUTH
===================================== */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            photo: profile.photos?.[0]?.value,
            displayName: profile.displayName,
          });
        } else {
          user.photo = profile.photos?.[0]?.value || user.photo;
          user.displayName = profile.displayName || user.displayName;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/* =====================================
   MIDDLEWARE
===================================== */

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// REQUIRED for secure cookies behind proxies (Render, Heroku, etc.)
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secure_random_string",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
     mongoUrl: process.env.MONGO_URL,
   }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* =====================================
   AUTH CHECK MIDDLEWARE (Local for User Routes)
===================================== */

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
};

/* =====================================
   AUTH ROUTES
===================================== */

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/?error=failed`,
  }),
  (req, res) => {
    res.redirect(FRONTEND_URL);
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

/* =====================================
   USER ROUTES
===================================== */

app.get("/api/user", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const firstLetter = user.email?.charAt(0) || "U";
    const photo =
      user.photo ||
      `https://ui-avatars.com/api/?name=${firstLetter}&background=6b4a3a&color=fff`;

    res.json({
      id: user._id,
      displayName: user.displayName || "Guest",
      email: user.email,
      photo,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.get("/api/user-status", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      loggedIn: true,
      userId: req.user.id,
      email: req.user.email,
    });
  }
  res.json({ loggedIn: false });
});

app.post("/add-user", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "User already exists" });

    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

/* =====================================
   AI CHAT ROUTE
===================================== */

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({
        error: "Message required",
      });
    }

    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are a smart helpful AI assistant.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply =
      response.choices?.[0]?.message?.content || "No response.";

    res.json({ reply });
  } catch (error) {
    res.status(500).json({
      error: "AI failed",
    });
  }
});

/* =====================================
   ROUTERS
===================================== */

app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

/* =====================================
   HEALTH & ERROR HANDLERS
===================================== */

app.get("/", (req, res) => {
  res.json({ message: "Backend API only. Use /api/* endpoints or /auth for authentication." });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

/* =====================================
   START SERVER
===================================== */

server.listen(PORT, () => {
  console.log(`🚀 Backend: ${BACKEND_URL}`);
  console.log(`🏠 Frontend: ${FRONTEND_URL}`);
  console.log(`💬 Socket.IO Ready`);
  console.log(`✅ Google Redirect: ${BACKEND_URL}/auth/google/callback`);
});