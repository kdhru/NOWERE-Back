// This file is deprecated and replaced with Socket.IO handlers in index.js
export default function socketHandler() {
  // All socket handling moved to backend/index.js
}
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