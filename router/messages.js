import express from "express";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Messege.js";

const router = express.Router();

const isAuth = (req, res, next) => {
if (req.isAuthenticated()) return next();
res.status(401).json({ error: "Login required" });
};

// SEARCH USERS
router.get("/search", isAuth, async (req, res) => {
const q = req.query.q || "";

const users = await User.find({
_id: { $ne: req.user._id },
displayName: { $regex: q, $options: "i" },
}).limit(10);

res.json(users);
});

// START CHAT
router.post("/start", isAuth, async (req, res) => {
const { userId } = req.body;

let convo = await Conversation.findOne({
members: { $all: [req.user._id, userId] },
});

if (!convo) {
convo = await Conversation.create({
members: [req.user._id, userId],
});
}

res.json(convo);
});

// SEND MESSAGE
router.post("/send", isAuth, async (req, res) => {
const { conversationId, receiverId, text } = req.body;

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
});

// GET MESSAGES
router.get("/:id", isAuth, async (req, res) => {
const msgs = await Message.find({
conversationId: req.params.id,
}).sort({ createdAt: 1 });

res.json(msgs);
});

// INBOX
router.get("/", isAuth, async (req, res) => {
const convos = await Conversation.find({
members: req.user._id,
})
.populate("members", "displayName photo")
.sort({ updatedAt: -1 });

res.json(convos);
});

// UNREAD COUNT
router.get("/unread/count", isAuth, async (req, res) => {
const count = await Message.countDocuments({
receiver: req.user._id,
seen: false,
});

res.json({ count });
});

export default router;

