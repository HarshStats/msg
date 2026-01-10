import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { 
  FiSearch, FiPaperclip, FiSend, FiMoreVertical, 
  FiPhone, FiVideo, FiArrowLeft, FiLock, FiUnlock 
} from "react-icons/fi"; 
import { BsCheck2All, BsBookmarkStarFill, BsBookmarkStar } from "react-icons/bs"; 
import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';
import Login from "./Login"; 
import "./App.css";

function App() {
  const [myId, setMyId] = useState(() => localStorage.getItem("chat_username"));

  if (!myId) {
    return (
      <Login onLogin={(username) => {
        setMyId(username);
        localStorage.setItem("chat_username", username);
      }} />
    );
  }

  return <ChatInterface myId={myId} onLogout={() => {
    setMyId(null);
    localStorage.removeItem("chat_username");
  }} />;
}

const ChatInterface = ({ myId, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Data States
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [allUsers, setAllUsers] = useState([]); 
  const [messages, setMessages] = useState([]); 
  
  // UI States
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  
  // SECURITY STATE
  const [secretKey, setSecretKey] = useState(""); 
  const [isKeySet, setIsKeySet] = useState(false);

  const scrollRef = useRef();
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  
  // 1. HELPER: Encryption / Decryption
  const encryptMessage = (text) => {
    if (!isKeySet || !secretKey) return text;
    return AES.encrypt(text, secretKey).toString();
  };

  const decryptMessage = (cipherText) => {
    if (!isKeySet || !secretKey) return "🔒 Encrypted";
    try {
      const bytes = AES.decrypt(cipherText, secretKey);
      const originalText = bytes.toString(encUtf8);
      return originalText || "🔒 Locked (Wrong Key)";
    } catch (e) {
      return "🔒 Locked";
    }
  };

  // 2. INITIAL DATA FETCH
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch("http://localhost:3000/users");
        const userData = await userRes.json();
        setAllUsers(userData);

        const msgRes = await fetch(`http://localhost:3000/messages/${myId}`);
        const msgData = await msgRes.json();
        setMessages(msgData);
      } catch (err) {
        console.log("Error fetching data", err);
      }
    };
    fetchData();
  }, [myId]);

  // 3. SOCKET CONNECTION
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("addNewUser", myId);
    });

    newSocket.on("disconnect", () => setIsConnected(false));
    newSocket.on("getOnlineUsers", (users) => setOnlineUsers(users));

    newSocket.on("getMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      if (selectedUserRef.current?.username !== message.senderId) {
        setNotifications((prev) => [message, ...prev]);
      }
    });

    return () => newSocket.disconnect();
  }, [myId]);

  // 4. HANDLERS
  const handleSend = () => {
    if (!currentMessage.trim() || !selectedUser) return;
    
    const encryptedText = encryptMessage(currentMessage);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageData = {
      senderId: myId, recipientId: selectedUser.username, text: encryptedText, time: time,
    };
    
    socket.emit("sendMessage", messageData);
    // Note: We don't add strictly to state here because socket will send it back to us if we are listening correctly,
    // but for instant UI response, we often add it. 
    // Ideally, the server response should contain the _id so we can save it immediately.
    // For now, we will wait for the socket "getMessage" or refresh to get the ID for saving.
  };

  const handleToggleMessage = async (msgId) => {
    if (!isKeySet) {
        alert("Enter the chat password to modify messages!");
        return;
    }
    try {
      // Optimistic UI Update (Change it instantly on screen)
      setMessages(prev => prev.map(m => {
          if (m._id === msgId) {
              return { ...m, isSaved: !m.isSaved };
          }
          return m;
      }));

      // Send request to server
      const res = await fetch(`http://localhost:3000/messages/toggle/${msgId}`, { method: "PUT" });
      const data = await res.json();
      
      // If server fails, revert UI (Optional, but good practice)
      if (!res.ok) {
          console.error("Toggle failed");
      }
    } catch (err) {
      console.error("Failed to toggle save", err);
    }
  };

  const getLastMessage = (userId) => {
    const userMessages = messages.filter(
      (m) => (m.senderId === myId && m.recipientId === userId) || (m.senderId === userId && m.recipientId === myId)
    );
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  };

  const filteredUsers = allUsers.filter(u => 
    u.username !== myId && u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentChatMessages = messages.filter(
    (msg) =>
      (msg.senderId === myId && msg.recipientId === selectedUser?.username) ||
      (msg.senderId === selectedUser?.username && msg.recipientId === myId)
  );

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentChatMessages]);

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <div className={`sidebar ${selectedUser ? "mobile-hidden" : ""}`}>
        <div className="sidebar-header">
          <div className="my-profile">
            <div className="avatar">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`} alt="avatar" />
              <span className="online-dot" style={{ background: isConnected ? "#4caf50" : "#ff9800" }}></span>
            </div>
            <div className="my-info">
              <h3>{myId} (You)</h3>
              <span className="status-text" style={{ color: isConnected ? "#4caf50" : "#ff9800" }}>
                {isConnected ? "Secure" : "Connecting..."}
              </span>
            </div>
          </div>
          
          <div className={`security-bar ${isKeySet ? "locked" : ""}`}>
            {isKeySet ? <FiLock className="lock-icon" /> : <FiUnlock className="unlock-icon" />}
            <input 
              type="password" 
              placeholder={isKeySet ? "Chat is Encrypted" : "Set Chat Password"} 
              value={secretKey}
              disabled={isKeySet}
              onChange={(e) => setSecretKey(e.target.value)}
            />
            <button onClick={() => setIsKeySet(!isKeySet)}>
              {isKeySet ? "Reset" : "Set"}
            </button>
          </div>

          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input 
              type="text" placeholder="Search" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="users-list">
          {filteredUsers.map((user) => {
            const isOnline = onlineUsers.some((online) => online.userId === user.username);
            const lastMsg = getLastMessage(user.username);
            const unreadCount = notifications.filter(n => n.senderId === user.username).length;
            
            let previewText = "No messages";
            if(lastMsg) {
                previewText = lastMsg.senderId === myId 
                    ? `You: ${decryptMessage(lastMsg.text)}` 
                    : decryptMessage(lastMsg.text);
            }

            return (
              <div
                key={user._id} 
                className={`user-card ${selectedUser?.username === user.username ? "active" : ""}`}
                onClick={() => {
                  setSelectedUser(user);
                  setNotifications((prev) => prev.filter((n) => n.senderId !== user.username));
                }}
              >
                <div className="avatar">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" />
                  {isOnline && <span className="online-dot"></span>}
                </div>
                <div className="user-info">
                  <div className="info-top">
                    <span className="username">{user.username}</span>
                    <span className="last-time">{lastMsg?.time || ""}</span>
                  </div>
                  <div className="info-bottom">
                    <p className="last-msg">{previewText}</p>
                    {unreadCount > 0 && <div className="badge">{unreadCount}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="logout-area"><button onClick={onLogout}>Logout</button></div>
      </div>

      {/* CHAT AREA */}
      <div className={`chat-area ${!selectedUser ? "mobile-hidden" : ""}`}>
        {selectedUser ? (
          <>
            <div className="chat-header">
              <div className="header-left">
                <FiArrowLeft className="back-btn" onClick={() => setSelectedUser(null)} />
                <div className="avatar small">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`} alt="avatar" />
                </div>
                <div className="header-info">
                  <h3>{selectedUser.username}</h3>
                  <span style={{color: "#888", fontSize: "12px"}}>
                    {isKeySet ? "🔒 End-to-End Encrypted" : "⚠️ Unencrypted (Set Password)"}
                  </span>
                </div>
              </div>
              <div className="header-icons"><FiPhone /><FiVideo /><FiMoreVertical /></div>
            </div>
            
            <div className="messages-box">
              {currentChatMessages.map((msg, index) => {
                const decryptedText = decryptMessage(msg.text);
                return (
                    <div key={index} className={`message-wrapper ${msg.senderId === myId ? "own" : "friend"}`}>
                    <div className="message-content" 
                         onClick={() => {
                             // Allow click on ANY message if key is set
                             if(msg._id && isKeySet) handleToggleMessage(msg._id);
                         }}
                         style={{ cursor: isKeySet ? "pointer" : "default" }}
                         title={msg.isSaved ? "Saved (Click to Unsave)" : "Click to Save (vanishes in 48h)"}
                    >
                        <p>{decryptedText}</p>
                        <div className="message-meta">
                        <span>{msg.time}</span>
                        {/* Show Different Icons for Saved State */}
                        {msg.isSaved && <BsBookmarkStarFill style={{marginLeft: "5px", color: "#ff9800"}} />}
                        {msg.senderId === myId && <BsCheck2All className="read-icon" />}
                        </div>
                    </div>
                    </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="chat-input-area">
              <button className="icon-btn"><FiPaperclip /></button>
              <div className="input-wrapper">
                <input
                  type="text" placeholder={isKeySet ? "Write a secured message..." : "Set Password to chat..."}
                  value={currentMessage}
                  disabled={!isKeySet} 
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
              </div>
              <button className="send-btn" onClick={handleSend} disabled={!isKeySet}><FiSend /></button>
            </div>
          </>
        ) : (
          <div className="no-chat"><p>Select a user & enter password to chat</p></div>
        )}
      </div>
    </div>
  );
};

export default App;