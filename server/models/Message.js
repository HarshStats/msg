import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    recipientId: { type: String, required: true },
    text: { type: String, required: true }, // This will store the "Gibberish" later
    time: { type: String, required: true },
    isSaved: { type: Boolean, default: false }, // New: Check if user saved it
    expireAt: { type: Date, default: Date.now, index: { expires: '48h' } } // New: Auto-delete in 48h
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);
export default Message;