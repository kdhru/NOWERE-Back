// // routes/messageRoutes.js
// import express from "express";
// import Message from "../models/Message.js";

// const router = express.Router();

// // GET CHAT BETWEEN TWO USERS
// router.get("/:user1/:user2", async (req, res) => {
//   const { user1, user2 } = req.params;

//   const messages = await Message.find({
//     $or: [
//       { sender: user1, receiver: user2 },
//       { sender: user2, receiver: user1 },
//     ],
//   }).sort({ createdAt: 1 });

//   res.json(messages);
// });

// export default router;