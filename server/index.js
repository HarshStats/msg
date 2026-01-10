import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs"; 
import Message from "./models/Message.js";
import User from "./models/User.js"; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chatApp";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ DB Connection Success"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// --- API ROUTES ---

// 1. REGISTER
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json("Username already taken");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    const savedUser = await newUser.save();

    res.status(200).json({ _id: savedUser._id, username: savedUser.username });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json("User not found");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json("Wrong password");

    res.status(200).json({ _id: user._id, username: user.username });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 3. GET ALL USERS
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "username"); 
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 4. GET ALL MESSAGES FOR A USER (New! For Sidebar Previews)
app.get("/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }]
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- SOCKET SERVER ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log(`⚡ New Connection: ${socket.id}`);

  socket.on("addNewUser", (userId) => {
    if (!onlineUsers.some((user) => user.userId === userId)) {
      onlineUsers.push({ userId, socketId: socket.id });
    }
    io.emit("getOnlineUsers", onlineUsers);
  });

  socket.on("sendMessage", async (message) => {
    const { senderId, recipientId, text, time } = message;
    try {
      const newMessage = new Message({ senderId, recipientId, text, time });
      await newMessage.save();
      
      const user = onlineUsers.find((user) => user.userId === recipientId);
      if (user) {
        io.to(user.socketId).emit("getMessage", message);
      }
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    io.emit("getOnlineUsers", onlineUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});