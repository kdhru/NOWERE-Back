import express from "express";
import Chat from "../models/Chat.js";
import fetch from "node-fetch";

const router = express.Router();
const BACKEND_URL = process.env.BACKEND_URL;

/* ===== AUTH MIDDLEWARE ===== */
const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Login required" });
};

/* ===== SEND MESSAGE ===== */
router.post("/send", isAuth, async (req, res) => {
  try {
    // 🚀 Unpack incoming image base64 from body alongside text
    let { message, chatId, image } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Empty message" });
    }

    message = message.trim();
    let chat;

    // CREATE OR FIND CHAT
    if (!chatId) {
      chat = await Chat.create({
        user: req.user._id,
        title: message.substring(0, 30),
        messages: [],
      });
    } else {
      chat = await Chat.findOne({
        _id: chatId,
        user: req.user._id,
      });
    }

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // SAVE USER MESSAGE WITH IMAGE
    chat.messages.push({
      role: "user",
      content: message,
      image: image || null, // 🚀 Saves base64 string to database doc
    });

    // LAST 10 HISTORY ITEMS FOR THIS CHAT ONLY
    const history = chat.messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
      image: msg.image || null, // 🚀 Propagates the image to your AI route payload
    }));

    let aiReply = "No response generated.";

    try {
      // Pass the local multimodal history alongside the user's global memory profile
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
          userMemory: req.user.aiMemory,
        }),
      });

      const data = await response.json();

      if (data?.reply) {
        aiReply = data.reply;
      }
    } catch (err) {
      console.error("AI Error:", err.message);
      aiReply = "AI service unavailable.";
    }

    // SAVE AI MESSAGE
    chat.messages.push({
      role: "assistant",
      content: aiReply,
    });

    // AUTO TITLE
    if (chat.messages.length === 2) {
      chat.title = message.substring(0, 30);
    }

    // LIMIT TOTAL MESSAGES
    if (chat.messages.length > 100) {
      chat.messages = chat.messages.slice(-100);
    }

    await chat.save();

    res.json({
      reply: aiReply,
      chatId: chat._id,
    });
  } catch (err) {
    console.error("Send Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===== CREATE CHAT (used for forwarded messages) ===== */
router.post("/create", isAuth, async (req, res) => {
  try {
    let { title, messages } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title required" });
    }

    title = title.trim();
    messages = Array.isArray(messages) ? messages : [];

    const existingChat = await Chat.findOne({
      user: req.user._id,
      title,
    });

    if (existingChat) {
      existingChat.messages.push(...messages);
      existingChat.updatedAt = new Date();
      await existingChat.save();
      return res.json(existingChat);
    }

    const chat = await Chat.create({
      user: req.user._id,
      title,
      messages,
    });

    res.json(chat);
  } catch (err) {
    console.error("Create Chat Error:", err.message || err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===== GET ALL CHATS ===== */
router.get("/", isAuth, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .select("title updatedAt");

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===== SEARCH CHAT ===== */
router.get("/search/:query", isAuth, async (req, res) => {
  try {
    const chats = await Chat.find({
      user: req.user._id,
      title: { $regex: req.params.query, $options: "i" },
    }).select("title updatedAt");

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===== GET SINGLE CHAT ===== */
router.get("/:id", isAuth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===== DELETE CHAT ===== */
router.delete("/:id", isAuth, async (req, res) => {
  try {
    const result = await Chat.deleteOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===== RENAME CHAT ===== */
router.put("/:id", isAuth, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title required" });
    }

    const result = await Chat.updateOne(
      { _id: req.params.id, user: req.user._id },
      { title: title.trim() }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ message: "Updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;