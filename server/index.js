import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs"; // I kept bcrypt since you had it!

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/secureChat";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ DB Connection Success"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// --- ⚠️ CRITICAL FIX: DEFINING SCHEMAS HERE ---
// This ensures 'privateKey' is definitely in the database structure.

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friendCode: { type: String, unique: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true }, // <--- SAVES YOUR KEY
  contacts: [{ type: String }] // Array of usernames
});

const MessageSchema = new mongoose.Schema({
  senderId: String,
  recipientId: String,
  text: String, 
  type: { type: String, default: "text" },
  time: String,
  isSaved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Create Models from the Schemas defined above
const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);


// --- ROUTES ---

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { username, password, publicKey, privateKey } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json("Username already taken");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const friendCode = `${username.toUpperCase()}-${randomSuffix}`;

    const newUser = new User({ 
        username, 
        password: hashedPassword,
        friendCode,
        publicKey,
        privateKey, // This will now correctly save to DB
        contacts: []
    });
    
    const savedUser = await newUser.save();

    res.status(200).json({ 
        _id: savedUser._id, 
        username: savedUser.username,
        friendCode: savedUser.friendCode 
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json(err);
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json("User not found");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json("Wrong password");

    // ⚠️ CRITICAL: RETURN THE PRIVATE KEY
    res.status(200).json({ 
        _id: user._id, 
        username: user.username,
        friendCode: user.friendCode,
        contacts: user.contacts,
        privateKey: user.privateKey 
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// ADD CONTACT
app.post("/add-contact", async (req, res) => {
    try {
        const { myId, friendCode } = req.body;
        const friend = await User.findOne({ friendCode });
        if (!friend) return res.status(404).json("User not found with that code");
        if (friend.username === myId) return res.status(400).json("You cannot add yourself");

        const me = await User.findOne({ username: myId });

        // Add friend to my list
        if (!me.contacts.includes(friend.username)) {
            me.contacts.push(friend.username);
            await me.save();
        }

        // Add me to friend's list
        if (!friend.contacts.includes(myId)) {
            friend.contacts.push(myId);
            await friend.save();
        }
        res.status(200).json("Contact added successfully");
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET CONTACTS
app.get("/contacts/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if(!user) return res.status(404).json([]);
    
    // Return contacts with their Public Keys (needed for encryption)
    const contacts = await User.find(
        { username: { $in: user.contacts } }, 
        "username publicKey friendCode"
    );
    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET MESSAGES
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

// TOGGLE SAVE
app.put("/messages/toggle/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json("Message not found");

    msg.isSaved = !msg.isSaved;
    await msg.save();
    
    res.status(200).json({ isSaved: msg.isSaved });
  } catch (err) {
    res.status(500).json(err);
  }
});

// DELETE MESSAGES
app.delete("/messages", async (req, res) => {
  try {
    const { ids } = req.body; 
    await Message.deleteMany({ _id: { $in: ids } });
    res.status(200).json("Messages deleted");
  } catch (err) {
    res.status(500).json(err);
  }
});

// NUKE CHAT
app.delete("/messages/nuke", async (req, res) => {
    try {
        const { myId, otherId } = req.body;
        await Message.deleteMany({
            $or: [
                { senderId: myId, recipientId: otherId },
                { senderId: otherId, recipientId: myId }
            ],
            isSaved: { $ne: true } 
        });

        const user1 = onlineUsers.find(u => u.username === myId);
        const user2 = onlineUsers.find(u => u.username === otherId);

        if(user1) io.to(user1.socketId).emit("chatNuked", { target: otherId });
        if(user2) io.to(user2.socketId).emit("chatNuked", { target: myId });

        res.status(200).json("Chat Nuked");
    } catch (err) {
        res.status(500).json(err);
    }
});

// --- SOCKET SERVER CONFIG ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
  maxHttpBufferSize: 1e7 // 10MB Limit
});

let onlineUsers = [];

io.on("connection", (socket) => {
  // Use 'username' consistently instead of 'userId'
  socket.on("addNewUser", (username) => {
    if (!onlineUsers.some((user) => user.username === username)) {
      onlineUsers.push({ username, socketId: socket.id });
    }
    io.emit("getOnlineUsers", onlineUsers);
  });

  socket.on("sendMessage", async (message) => {
    // Save to DB
    try {
      const newMessage = new Message({
          senderId: message.senderId,
          recipientId: message.recipientId,
          text: message.text,
          type: message.type || "text",
          time: message.time
      });
      const savedMsg = await newMessage.save();
      
      // Send to Recipient
      const user = onlineUsers.find((user) => user.username === message.recipientId);
      if (user) {
        io.to(user.socketId).emit("getMessage", savedMsg);
      }
    } catch (error) { console.log(error); }
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
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    io.emit("getOnlineUsers", onlineUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));