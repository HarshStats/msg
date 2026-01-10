import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { 
  FiSearch, FiPaperclip, FiSend, FiMoreVertical, 
  FiPhone, FiVideo, FiArrowLeft, FiUserPlus, FiCopy 
} from "react-icons/fi"; 
import { BsCheck2All, BsBookmarkStarFill } from "react-icons/bs"; 
import Login from "./Login"; 
import { deriveSharedKey, encryptText, decryptText } from "./crypto"; 
import "./App.css";

function App() {
  const [myId, setMyId] = useState(() => localStorage.getItem("chat_username"));

  // If not logged in, show Login Screen
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
  
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [contacts, setContacts] = useState([]); 
  const [messages, setMessages] = useState([]); 
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  
  // NEW: Add Friend State
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const myFriendCode = localStorage.getItem("my_friend_code") || "Loading...";

  const sharedKeysCache = useRef({}); 
  const scrollRef = useRef();
  const selectedUserRef = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  
  // 1. FETCH CONTACTS
  const fetchContacts = async () => {
      try {
        const res = await fetch(`http://localhost:3000/contacts/${myId}`);
        const data = await res.json();
        setContacts(data || []);
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchContacts();
    const fetchMsgs = async () => {
        try {
            const res = await fetch(`http://localhost:3000/messages/${myId}`);
            const data = await res.json();
            setMessages(data);
        } catch(e) {}
    };
    fetchMsgs();
  }, [myId]);

  // 2. SOCKET
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);
    newSocket.on("connect", () => { setIsConnected(true); newSocket.emit("addNewUser", myId); });
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

  // 3. CRYPTO HELPER
  const getSharedKey = async (otherUser) => {
      if (!otherUser) return null;
      if (sharedKeysCache.current[otherUser.username]) return sharedKeysCache.current[otherUser.username];

      const myPrivKeyJwk = JSON.parse(localStorage.getItem(`priv_${myId}`));
      if (!myPrivKeyJwk || !otherUser.publicKey) return null;

      const key = await deriveSharedKey(myPrivKeyJwk, otherUser.publicKey);
      sharedKeysCache.current[otherUser.username] = key;
      return key;
  };

  // 4. SEND MESSAGE
  const handleSend = async () => {
    if (!currentMessage.trim() || !selectedUser) return;
    
    const sharedKey = await getSharedKey(selectedUser);
    let finalPayload = currentMessage;
    if (sharedKey) {
        finalPayload = await encryptText(sharedKey, currentMessage);
    }
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = {
      senderId: myId, recipientId: selectedUser.username, text: finalPayload, time: time,
    };
    
    socket.emit("sendMessage", messageData);
    setMessages((prev) => [...prev, messageData]); 
    setCurrentMessage("");
  };

  // 5. ADD FRIEND
  const handleAddFriend = async () => {
      if(!friendCodeInput) return;
      try {
          const res = await fetch("http://localhost:3000/add-contact", {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({ myId, friendCode: friendCodeInput })
          });
          const msg = await res.json();
          alert(msg);
          if (res.ok) {
              setShowAddFriend(false);
              setFriendCodeInput("");
              fetchContacts();
          }
      } catch(err) { alert("Error adding friend"); }
  };

  const handleToggleMessage = async (msgId) => {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isSaved: !m.isSaved } : m));
      await fetch(`http://localhost:3000/messages/toggle/${msgId}`, { method: "PUT" });
  };

  // 6. DECRYPTION
  const [decryptedCache, setDecryptedCache] = useState({});

  useEffect(() => {
      const processMessages = async () => {
          const newCache = { ...decryptedCache };
          for (let msg of currentChatMessages) {
              if (!newCache[msg._id || msg.time]) { 
                  const otherUsername = msg.senderId === myId ? msg.recipientId : msg.senderId;
                  const contact = contacts.find(c => c.username === otherUsername);
                  if (contact) {
                      const key = await getSharedKey(contact);
                      if (key) {
                          const text = await decryptText(key, msg.text);
                          newCache[msg._id || msg.time] = text;
                      }
                  }
              }
          }
          setDecryptedCache(newCache);
      };
      if (currentChatMessages.length > 0) processMessages();
  }, [messages, selectedUser]); 

  const filteredContacts = contacts.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentChatMessages = messages.filter(msg => 
      (msg.senderId === myId && msg.recipientId === selectedUser?.username) ||
      (msg.senderId === selectedUser?.username && msg.recipientId === myId)
  );
  
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentChatMessages, decryptedCache]);

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
              <h3>{myId}</h3>
              <div className="copy-code" onClick={() => {navigator.clipboard.writeText(myFriendCode); alert("Copied: " + myFriendCode)}}>
                  <span>ID: {myFriendCode}</span> <FiCopy />
              </div>
            </div>
          </div>
          
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search friends" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          
          <button className="add-friend-btn" onClick={() => setShowAddFriend(!showAddFriend)}>
              <FiUserPlus /> {showAddFriend ? "Close" : "Add Friend"}
          </button>
          
          {showAddFriend && (
              <div className="add-friend-box">
                  <input placeholder="Enter Friend ID (e.g. USER-1234)" value={friendCodeInput} onChange={e => setFriendCodeInput(e.target.value)} />
                  <button onClick={handleAddFriend}>Add</button>
              </div>
          )}
        </div>
        
        <div className="users-list">
          {filteredContacts.length === 0 && <p style={{padding: "20px", color: "#888", textAlign: "center", fontSize: "12px"}}>No friends yet.<br/>Share your ID to connect!</p>}
          {filteredContacts.map((user) => {
            const isOnline = onlineUsers.some((online) => online.userId === user.username);
            const unreadCount = notifications.filter(n => n.senderId === user.username).length;
            return (
              <div key={user._id} className={`user-card ${selectedUser?.username === user.username ? "active" : ""}`}
                onClick={() => { setSelectedUser(user); setNotifications((prev) => prev.filter((n) => n.senderId !== user.username)); }} >
                <div className="avatar">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" />
                  {isOnline && <span className="online-dot"></span>}
                </div>
                <div className="user-info">
                  <span className="username">{user.username}</span>
                  {unreadCount > 0 && <div className="badge">{unreadCount}</div>}
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
                <div className="avatar small"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`} alt="avatar" /></div>
                <div className="header-info">
                  <h3>{selectedUser.username}</h3>
                  <span style={{color: "#4caf50", fontSize: "12px"}}>🔒 End-to-End Encrypted</span>
                </div>
              </div>
              <div className="header-icons"><FiPhone /><FiVideo /><FiMoreVertical /></div>
            </div>
            
            <div className="messages-box">
              {currentChatMessages.map((msg, index) => {
                const displayText = decryptedCache[msg._id || msg.time] || "🔒 Decrypting...";
                return (
                    <div key={index} className={`message-wrapper ${msg.senderId === myId ? "own" : "friend"}`}>
                    <div className="message-content" onClick={() => {if(msg._id) handleToggleMessage(msg._id)}} style={{cursor:"pointer"}} title="Toggle Save">
                        <p>{displayText}</p>
                        <div className="message-meta">
                        <span>{msg.time}</span>
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
                <input type="text" placeholder="Message..." value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
              </div>
              <button className="send-btn" onClick={handleSend}><FiSend /></button>
            </div>
          </>
        ) : (
          <div className="no-chat">
             <h3>Welcome {myId}!</h3>
             <p>Your Friend ID: <b>{myFriendCode}</b></p>
             <p>Share this ID to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;