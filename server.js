require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const UserModel = require("./models/User");
const { addUser, removeUser, getUser, getUsersByRoom } = require("./utils/user");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Connect to MongoDB
mongoose
  .connect("process.env.MONGO_URI", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

const roomElements = {};

app.get("/", (req, res) => {
  res.send("Realtime Whiteboard Server Running");
});

io.on("connection", (socket) => {
  socket.on("userJoined", async (data) => {
    const { name, userId, roomId, host, presenter } = data;
    socket.join(roomId);

    addUser({
      name,
      userId,
      roomId,
      host,
      presenter,
      socketId: socket.id,
    });

    // Save to MongoDB
    try {
      const existing = await UserModel.findOne({ userId });
      if (!existing) {
        const newUser = new UserModel({ name, userId, roomId });
        await newUser.save();
      }
    } catch (err) {
      console.error("MongoDB save error:", err.message);
    }

    const users = getUsersByRoom(roomId);

    socket.emit("userIsJoined", { success: true, users });
    socket.to(roomId).emit("userJoinedMessageBroadcasted", { name, roomId });
    io.to(roomId).emit("allUsers", users);

    socket.emit("whiteboardDataResponse", {
      elements: roomElements[roomId] || [],
    });
  });

  socket.on("whiteboardData", ({ elements }) => {
    const user = getUser(socket.id);
    if (!user) return;

    roomElements[user.roomId] = elements;
    socket.to(user.roomId).emit("whiteboardDataResponse", { elements });
  });

  socket.on("disconnect", async () => {
    const user = getUser(socket.id);
    if (user) {
      removeUser(socket.id);

      try {
        await UserModel.deleteOne({ userId: user.userId });
      } catch (err) {
        console.error("MongoDB delete error:", err.message);
      }

      const users = getUsersByRoom(user.roomId);

      socket.to(user.roomId).emit("userLeftMessageBroadcasted", {
        name: user.name,
        roomId: user.roomId,
      });

      io.to(user.roomId).emit("allUsers", users);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
