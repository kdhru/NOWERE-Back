import express from "express";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

// SEARCH USERS
router.get("/search", isAuth, async (req, res) => {
  try {
    const q = req.query.q || "";
    const users = await User.find({
      _id: { $ne: req.user._id },
      displayName: { $regex: q, $options: "i" },
    }).limit(10);
    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// START CHAT
router.post("/start", isAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    let convo = await Conversation.findOne({
      members: { $all: [req.user._id, userId] },
    });

    if (!convo) {
      convo = await Conversation.create({
        members: [req.user._id, userId],
      });
    }
    res.json(convo);
  } catch (err) {
    console.error("Start chat error:", err);
    res.status(500).json({ error: "Failed to start chat" });
  }
});

// SEND MESSAGE
router.post("/send", isAuth, async (req, res) => {
  try {
    const { conversationId, receiverId, text } = req.body;
    if (!conversationId || !receiverId || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const msg = await Message.create({
      conversationId,
      sender: req.user._id,
      receiver: receiverId,
      text,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastSender: req.user._id,
      updatedAt: new Date(),
    });

    res.json(msg);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET MESSAGES
router.get("/:id", isAuth, async (req, res) => {
  try {
    const msgs = await Message.find({
      conversationId: req.params.id,
    }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// INBOX
router.get("/", isAuth, async (req, res) => {
  try {
    const convos = await Conversation.find({
      members: req.user._id,
    })
      .populate("members", "displayName photo")
      .sort({ updatedAt: -1 });
    res.json(convos);
  } catch (err) {
    console.error("Inbox error:", err);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

// UNREAD COUNT
router.get("/unread/count", isAuth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      seen: false,
    });
    res.json({ count });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

export default router;

