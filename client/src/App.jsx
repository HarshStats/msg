import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { 
  FiSearch, FiPaperclip, FiSend, FiMoreVertical, 
  FiPhone, FiVideo, FiImage, FiMic 
} from "react-icons/fi"; 
import { BsCheck2All } from "react-icons/bs"; 
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
  
  // Data States
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [allUsers, setAllUsers] = useState([]); 
  const [messages, setMessages] = useState([]); 
  
  // UI States
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);

  const scrollRef = useRef();
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  
  // 1. INITIAL DATA FETCH
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

  // 2. SOCKET CONNECTION
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("addNewUser", myId);
    });

    newSocket.on("getOnlineUsers", (users) => setOnlineUsers(users));

    newSocket.on("getMessage", (message) => {
      setMessages((prev) => [...prev, message]);

      if (selectedUserRef.current?.username !== message.senderId) {
        setNotifications((prev) => [message, ...prev]);
      }
    });

    return () => newSocket.disconnect();
  }, [myId]);

  const handleSend = () => {
    if (!currentMessage.trim() || !selectedUser) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = {
      senderId: myId, recipientId: selectedUser.username, text: currentMessage, time: time,
    };
    socket.emit("sendMessage", messageData);
    setMessages((prev) => [...prev, messageData]);
    setCurrentMessage("");
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
      <div className="sidebar">
        
        {/* FIXED HEADER SECTION */}
        <div className="sidebar-header">
          {/* My Profile Row */}
          <div className="my-profile">
            <div className="avatar">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`} alt="avatar" />
              <span className="online-dot"></span>
            </div>
            <div className="my-info">
              <h3>{myId} (You)</h3>
              <span className="status-text">Online</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input 
              type="text" placeholder="Search" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* SCROLLABLE USERS LIST */}
        <div className="users-list">
          {filteredUsers.map((user) => {
            const isOnline = onlineUsers.some((online) => online.userId === user.username);
            const lastMsg = getLastMessage(user.username);
            const unreadCount = notifications.filter(n => n.senderId === user.username).length;
            
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
                    <p className="last-msg">
                       {lastMsg ? (lastMsg.senderId === myId ? `You: ${lastMsg.text}` : lastMsg.text) : "No messages yet"}
                    </p>
                    {unreadCount > 0 && <div className="badge">{unreadCount}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* LOGOUT BUTTON */}
        <div className="logout-area">
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <div className="header-left">
                <div className="avatar small">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`} alt="avatar" />
                </div>
                <div className="header-info">
                  <h3>{selectedUser.username}</h3>
                  {onlineUsers.some(u => u.userId === selectedUser.username) ? 
                    <span style={{color: "#4caf50", fontSize: "12px"}}>Online</span> : 
                    <span style={{color: "#888", fontSize: "12px"}}>Offline</span>
                  }
                </div>
              </div>
              <div className="header-icons"><FiPhone /><FiVideo /><FiMoreVertical /></div>
            </div>
            
            <div className="messages-box">
              {currentChatMessages.map((msg, index) => (
                <div key={index} className={`message-wrapper ${msg.senderId === myId ? "own" : "friend"}`}>
                  <div className="message-content">
                    <p>{msg.text}</p>
                    <div className="message-meta">
                      <span>{msg.time}</span>
                      {msg.senderId === myId && <BsCheck2All className="read-icon" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="chat-input-area">
              <button className="icon-btn"><FiPaperclip /></button>
              <div className="input-wrapper">
                <input
                  type="text" placeholder="Write a message..." value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
              </div>
              <button className="send-btn" onClick={handleSend}><FiSend /></button>
            </div>
          </>
        ) : (
          <div className="no-chat"><p>Select a user to chat</p></div>
        )}
      </div>
    </div>
  );
};

export default App;