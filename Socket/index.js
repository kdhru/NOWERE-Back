// import Message from "../models/Message.js";
// import User from "../models/User.js";

// const onlineUsers = new Map(); // userId -> [socketIds]

// export default function socketHandler(io) {
//   io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);

//     /* ================= JOIN ================= */
//     socket.on("join", async (userId) => {
//       try {
//         socket.join(userId);

//         // MULTI DEVICE SUPPORT
//         if (!onlineUsers.has(userId)) {
//           onlineUsers.set(userId, []);
//         }
//         onlineUsers.get(userId).push(socket.id);

//         await User.findByIdAndUpdate(userId, {
//           isOnline: true,
//         });

//         console.log("User joined:", userId);
//       } catch (err) {
//         console.error("Join error:", err);
//       }
//     });

//     /* ================= SEND MESSAGE ================= */
//     socket.on("sendMessage", async (data) => {
//       try {
//         let msg = await Message.create({
//           sender: data.sender,
//           receiver: data.receiver,
//           content: data.content,
//           file: data.file || null,
//           status: "sent",
//         });

//         msg = await msg.populate("sender receiver", "displayName photo email");

//         const messageData = msg.toJSON();

//         const receiverSockets = onlineUsers.get(String(data.receiver));

//         if (receiverSockets && receiverSockets.length > 0) {
//           // UPDATE STATUS TO DELIVERED
//           msg.status = "delivered";
//           await msg.save();
//           messageData.status = "delivered";

//           // SEND TO ALL RECEIVER DEVICES
//           receiverSockets.forEach((id) => {
//             io.to(id).emit("receiveMessage", messageData);
//           });
//         }

//         // SEND BACK TO SENDER
//         socket.emit("messageSent", messageData);

//         console.log("Message sent:", msg._id);
//       } catch (err) {
//         console.error("Send message error:", err);
//         socket.emit("messageError", { error: err.message });
//       }
//     });

//     /* ================= READ RECEIPT ================= */
//     socket.on("readMessage", async ({ msgId, senderId }) => {
//       try {
//         const msg = await Message.findByIdAndUpdate(
//           msgId,
//           { status: "read" },
//           { new: true }
//         );

//         // NOTIFY SENDER
//         const senderSockets = onlineUsers.get(String(senderId));

//         if (senderSockets) {
//           senderSockets.forEach((id) => {
//             io.to(id).emit("messageRead", {
//               id: msgId,
//               status: "read",
//             });
//           });
//         }
//       } catch (err) {
//         console.error("Read error:", err);
//       }
//     });

//     /* ================= TYPING ================= */
//     socket.on("typing", ({ to, from }) => {
//       const receiverSockets = onlineUsers.get(String(to));

//       if (receiverSockets) {
//         receiverSockets.forEach((id) => {
//           io.to(id).emit("userTyping", { from });
//         });
//       }
//     });

//     /* ================= STOP TYPING ================= */
//     socket.on("stopTyping", ({ to, from }) => {
//       const receiverSockets = onlineUsers.get(String(to));

//       if (receiverSockets) {
//         receiverSockets.forEach((id) => {
//           io.to(id).emit("userStoppedTyping", { from });
//         });
//       }
//     });

//     /* ================= DISCONNECT ================= */
//     socket.on("disconnect", async () => {
//       try {
//         for (let [userId, sockets] of onlineUsers.entries()) {
//           if (sockets.includes(socket.id)) {
//             const updated = sockets.filter((id) => id !== socket.id);

//             if (updated.length === 0) {
//               onlineUsers.delete(userId);

//               await User.findByIdAndUpdate(userId, {
//                 isOnline: false,
//                 lastSeen: new Date(),
//               });

//               // NOTIFY ALL USERS ABOUT OFFLINE STATUS
//               io.emit("userOffline", { userId, lastSeen: new Date() });
//             } else {
//               onlineUsers.set(userId, updated);
//             }
//           }
//         }

//         console.log("User disconnected:", socket.id);
//       } catch (err) {
//         console.error("Disconnect error:", err);
//       }
//     });
//   });
// }