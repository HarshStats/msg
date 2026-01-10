import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    recipientId: { type: String, required: true },
    text: { type: String, required: true }, // Stores encrypted text or Base64 image
    type: { type: String, default: "text" }, // New: 'text' or 'image'
    time: { type: String, required: true },
    isSaved: { type: Boolean, default: false },
    expireAt: { type: Date, default: Date.now, index: { expires: '48h' } }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);
export default Message;