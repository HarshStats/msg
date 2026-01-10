import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    recipientId: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: String, required: true }, // We will store the formatted time string
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

const Message = mongoose.model("Message", messageSchema);

export default Message;