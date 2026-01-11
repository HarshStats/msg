import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ DB Connection Success"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// 2. SCHEMA (Added privateKey here!)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true }, // <--- SAVES YOUR KEY
  friendCode: { type: String, unique: true }
});

const MessageSchema = new mongoose.Schema({
  senderId: String,
  recipientId: String,
  text: String, // Encrypted String
  type: { type: String, default: "text" },
  time: String,
  isSaved: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// 3. ROUTES
// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { username, password, publicKey, privateKey } = req.body;
    
    // Check if user exists
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json("Username taken");

    // Generate Friend Code (e.g., USER-1234)
    const friendCode = `${username.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = new User({ username, password, publicKey, privateKey, friendCode });
    await newUser.save();

    res.status(200).json(newUser);
  } catch (err) {
    res.status(500).json("Error registering user");
  }
});

// LOGIN (Returns the Private Key now!)
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    if (!user) return res.status(400).json("Invalid credentials");
    
    // Send back the user AND their private key
    res.status(200).json(user); 
  } catch (err) {
    res.status(500).json("Error logging in");
  }
});

// GET CONTACTS
app.get("/contacts/:username", async (req, res) => {
  // Find all users EXCEPT me
  const allUsers = await User.find({ username: { $ne: req.params.username } });
  res.status(200).json(allUsers);
});

// ADD CONTACT (By Friend Code)
app.post("/add-contact", async (req, res) => {
    // For this simple version, we just return success since we list all users anyway
    res.status(200).json("Friend added");
});

// GET MESSAGES
app.get("/messages/:myId", async (req, res) => {
  const { myId } = req.params;
  const messages = await Message.find({
    $or: [{ senderId: myId }, { recipientId: myId }]
  });
  res.status(200).json(messages);
});

// NUKE CHAT
app.delete("/messages/nuke", async (req, res) => {
    const { myId, otherId } = req.body;
    await Message.deleteMany({
        $or: [
            { senderId: myId, recipientId: otherId, isSaved: false },
            { senderId: otherId, recipientId: myId, isSaved: false }
        ]
    });
    // Notify clients via Socket
    io.emit("chatNuked", { target: otherId }); 
    res.status(200).json("Nuked");
});

// DELETE SELECTED
app.delete("/messages", async (req, res) => {
    const { ids } = req.body;
    await Message.deleteMany({ _id: { $in: ids } });
    res.status(200).json("Deleted");
});

// SAVE/UNSAVE MESSAGE
app.put("/messages/toggle/:id", async (req, res) => {
    const msg = await Message.findById(req.params.id);
    if(msg) {
        msg.isSaved = !msg.isSaved;
        await msg.save();
    }
    res.status(200).json(msg);
});

// 4. SOCKET.IO SERVER
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

let onlineUsers = [];

io.on("connection", (socket) => {
  socket.on("addNewUser", (username) => {
    if (!onlineUsers.some((u) => u.username === username)) {
      onlineUsers.push({ username, socketId: socket.id });
    }
    io.emit("getOnlineUsers", onlineUsers);
  });

  socket.on("sendMessage", async (message) => {
    const newMsg = new Message(message);
    const savedMsg = await newMsg.save();
    
    // Send to recipient if online
    const user = onlineUsers.find((u) => u.username === message.recipientId);
    if (user) {
      io.to(user.socketId).emit("getMessage", savedMsg);
    }
  });

  // Call Events
  socket.on("callUser", (data) => {
      const user = onlineUsers.find((u) => u.username === data.userToCall);
      if(user) io.to(user.socketId).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
      else socket.emit("callFailed", { reason: "User offline" });
  });

  socket.on("answerCall", (data) => {
      const user = onlineUsers.find((u) => u.username === data.to);
      if(user) io.to(user.socketId).emit("callAccepted", data.signal);
  });

  socket.on("endCall", (data) => {
      const user = onlineUsers.find((u) => u.username === data.to);
      if(user) io.to(user.socketId).emit("callEnded");
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    io.emit("getOnlineUsers", onlineUsers);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});