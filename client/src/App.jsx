import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { 
  FiSearch, FiPaperclip, FiSend, FiMoreVertical, 
  FiArrowLeft, FiUserPlus, FiCopy,
  FiTrash2, FiCornerUpRight, FiX, FiShield 
} from "react-icons/fi"; 
import { BsCheck2All, BsBookmarkStarFill, BsCircle, BsCheckCircleFill } from "react-icons/bs"; 
import Login from "./Login"; 
import { deriveSharedKey, encryptText, decryptText } from "./crypto"; 
import "./App.css";

function App() {
  const [myId, setMyId] = useState(() => localStorage.getItem("chat_username"));

  if (!myId) {
    return <Login onLogin={(username) => {
        setMyId(username);
        localStorage.setItem("chat_username", username);
      }} />;
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
  
  // STATE FOR SELECT / DELETE / FORWARD
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false); 
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const myFriendCode = localStorage.getItem("my_friend_code") || "Loading...";

  const [decryptedCache, setDecryptedCache] = useState({});
  const sharedKeysCache = useRef({}); 
  const scrollRef = useRef();
  const selectedUserRef = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  
  // 1. DATA FETCHING
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

  // 3. CRYPTO HELPERS
  const getSharedKey = async (otherUser) => {
      if (!otherUser) return null;
      if (sharedKeysCache.current[otherUser.username]) return sharedKeysCache.current[otherUser.username];

      const myPrivKeyJwk = JSON.parse(localStorage.getItem(`priv_${myId}`));
      if (!myPrivKeyJwk || !otherUser.publicKey) return null;

      const key = await deriveSharedKey(myPrivKeyJwk, otherUser.publicKey);
      sharedKeysCache.current[otherUser.username] = key;
      return key;
  };

  // 4. ACTION HANDLERS
  const handleSend = async (textToSend = currentMessage, recipient = selectedUser) => {
    if (!textToSend?.trim() || !recipient) return;
    
    const sharedKey = await getSharedKey(recipient);
    let finalPayload = textToSend;
    if (sharedKey) {
        finalPayload = await encryptText(sharedKey, textToSend);
    }
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = {
      senderId: myId, recipientId: recipient.username, text: finalPayload, time: time,
    };
    
    socket.emit("sendMessage", messageData);
    setMessages((prev) => [...prev, messageData]); 
    if(recipient === selectedUser) setCurrentMessage("");
  };

  const handleAddFriend = async () => {
      if(!friendCodeInput) return;
      try {
          const res = await fetch("http://localhost:3000/add-contact", {
              method: "POST", headers: {"Content-Type": "application/json"},
              body: JSON.stringify({ myId, friendCode: friendCodeInput })
          });
          if (res.ok) { setShowAddFriend(false); setFriendCodeInput(""); fetchContacts(); }
      } catch(err) { alert("Error adding friend"); }
  };

  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedMsgIds([]);
      setIsForwarding(false);
  };

  const handleMessageClick = async (msg) => {
      if (isSelectionMode) {
          if (selectedMsgIds.includes(msg._id)) {
              setSelectedMsgIds(prev => prev.filter(id => id !== msg._id));
          } else {
              setSelectedMsgIds(prev => [...prev, msg._id]);
          }
          return;
      }
      if(msg._id) {
          setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isSaved: !m.isSaved } : m));
          await fetch(`http://localhost:3000/messages/toggle/${msg._id}`, { method: "PUT" });
      }
  };

  const handleDeleteSelected = async () => {
      if(!window.confirm(`Delete ${selectedMsgIds.length} messages?`)) return;
      try {
          await fetch("http://localhost:3000/messages", {
              method: "DELETE", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: selectedMsgIds })
          });
          setMessages(prev => prev.filter(m => !selectedMsgIds.includes(m._id)));
          setIsSelectionMode(false);
          setSelectedMsgIds([]);
      } catch(e) { console.error("Delete failed", e); }
  };

  const initForwarding = () => {
      setIsForwarding(true); 
      alert("Select a contact to forward to");
  };

  const handleUserClick = async (user) => {
      if (isForwarding) {
          if(!window.confirm(`Forward ${selectedMsgIds.length} messages to ${user.username}?`)) return;
          for (let msgId of selectedMsgIds) {
              const rawText = decryptedCache[msgId]; 
              if (rawText) await handleSend(rawText, user);
          }
          setIsForwarding(false);
          setIsSelectionMode(false);
          setSelectedMsgIds([]);
          setSelectedUser(user); 
          return;
      }
      setSelectedUser(user);
      setNotifications((prev) => prev.filter((n) => n.senderId !== user.username));
      setIsSelectionMode(false); 
  };

  // 5. DECRYPTION
  useEffect(() => {
      const processMessages = async () => {
          const newCache = { ...decryptedCache };
          for (let msg of currentChatMessages) {
              const keyId = msg._id || msg.time;
              if (!newCache[keyId]) { 
                  const otherUsername = msg.senderId === myId ? msg.recipientId : msg.senderId;
                  const contact = contacts.find(c => c.username === otherUsername);
                  if (contact) {
                      const key = await getSharedKey(contact);
                      if (key) {
                          const text = await decryptText(key, msg.text);
                          newCache[keyId] = text; 
                          if(msg._id) newCache[msg._id] = text; 
                      }
                  }
              }
          }
          setDecryptedCache(newCache);
      };
      if (messages.length > 0 && selectedUser) processMessages();
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
          
          {/* --- SIDEBAR LOGO --- */}
          <div className="brand-header">
            <h1 className="logo-text">MSG</h1>
            <p className="logo-tagline">Secure. Ephemeral. Private.</p>
          </div>
          {/* -------------------- */}

          {isForwarding ? (
             <div className="forward-header">
                <h3>Select Recipient</h3>
                <button onClick={() => {setIsForwarding(false); setIsSelectionMode(false)}}>Cancel</button>
             </div>
          ) : (
            <>
            <div className="my-profile">
                <div className="avatar">
                <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${myId}&backgroundColor=003344&textColor=00bcd4&fontWeight=700`} 
                    alt="avatar" 
                />
                <span className="online-dot" style={{ background: isConnected ? "#00e676" : "#ff9800" }}></span>
                </div>
                <div className="my-info">
                <h3>{myId}</h3>
                <div className="status-text">Online</div>
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
                    <input placeholder="Friend ID" value={friendCodeInput} onChange={e => setFriendCodeInput(e.target.value)} />
                    <button onClick={handleAddFriend}>Add</button>
                </div>
            )}
            </>
          )}
        </div>
        
        <div className="users-list">
          {filteredContacts.map((user) => {
              const unreadCount = notifications.filter(n => n.senderId === user.username).length;

              return (
              <div key={user._id} className={`user-card ${selectedUser?.username === user.username ? "active" : ""}`}
                onClick={() => handleUserClick(user)} >
                <div className="avatar">
                  <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}&backgroundColor=003344&textColor=00bcd4&fontWeight=700`} 
                    alt="avatar" 
                  />
                </div>
                <div className="user-info">
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%"}}>
                    <span className="username">{user.username}</span>
                    {unreadCount > 0 && <div className="badge">{unreadCount}</div>}
                  </div>
                  {isForwarding && <FiCornerUpRight style={{color: "#00bcd4", marginTop: "4px"}} />}
                </div>
              </div>
          )})}
        </div>
        <div className="logout-area"><button onClick={onLogout}>SECURE LOGOUT</button></div>
      </div>

      {/* CHAT AREA */}
      <div className={`chat-area ${!selectedUser ? "mobile-hidden" : ""}`}>
        {selectedUser ? (
          <>
            <div className={`chat-header ${isSelectionMode ? "selection-mode" : ""}`}>
              {isSelectionMode ? (
                  <div className="header-left selection-tools" style={{width:"100%", justifyContent:"space-between"}}>
                      <div style={{display:"flex", alignItems:"center", gap:"10px", color: "white"}}>
                        <FiX className="icon-btn" onClick={toggleSelectionMode} />
                        <span style={{fontWeight:"bold"}}>{selectedMsgIds.length} Selected</span>
                      </div>
                      <div style={{display:"flex", gap:"20px"}}>
                          {selectedMsgIds.length > 0 && (
                              <>
                                <FiTrash2 className="icon-btn" onClick={handleDeleteSelected} title="Delete" />
                                <FiCornerUpRight className="icon-btn" onClick={initForwarding} title="Forward" />
                              </>
                          )}
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="header-left">
                        <FiArrowLeft className="back-btn icon-btn" onClick={() => setSelectedUser(null)} style={{marginRight: "15px"}}/>
                        <div className="avatar small">
                            <img 
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.username}&backgroundColor=003344&textColor=00bcd4&fontWeight=700`} 
                                alt="avatar" 
                            />
                        </div>
                        <div className="header-info">
                        <h3>{selectedUser.username}</h3>
                        <div style={{display:"flex", alignItems:"center", gap:"5px", fontSize: "11px", color: "#00bcd4"}}>
                            <FiShield size={10} /> <span>End-to-End Encrypted</span>
                        </div>
                        </div>
                    </div>
                    <div className="header-icons">
                        <FiMoreVertical onClick={toggleSelectionMode} title="Select Messages" />
                    </div>
                  </>
              )}
            </div>
            
            <div className="messages-box">
              {currentChatMessages.map((msg, index) => {
                const displayText = decryptedCache[msg._id || msg.time] || "🔒 Decrypting...";
                const isSelected = selectedMsgIds.includes(msg._id);
                
                return (
                    <div key={index} className={`message-wrapper ${msg.senderId === myId ? "own" : "friend"} ${isSelectionMode ? "selectable" : ""}`}>
                        {isSelectionMode && (
                            <div className="selection-checkbox" onClick={() => handleMessageClick(msg)}>
                                {isSelected ? <BsCheckCircleFill color="#00bcd4" size={20}/> : <BsCircle color="#555" size={20}/>}
                            </div>
                        )}
                        <div className={`message-content ${isSelected ? "selected-bubble" : ""}`} 
                             onClick={() => handleMessageClick(msg)}
                             style={{cursor: isSelectionMode ? "pointer" : "default"}}
                        >
                            <p>{displayText}</p>
                            <div className="message-meta">
                            <span>{msg.time}</span>
                            {!isSelectionMode && msg.isSaved && <BsBookmarkStarFill style={{marginLeft: "5px", color: "#ffd700"}} />}
                            {!isSelectionMode && msg.senderId === myId && <BsCheck2All className="read-icon" />}
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
                <input type="text" placeholder="Type a secured message..." value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                  disabled={isSelectionMode} 
                />
              </div>
              <button className="send-btn" onClick={() => handleSend()} disabled={isSelectionMode}><FiSend /></button>
            </div>
          </>
        ) : (
          /* --- MODIFIED: NO CHAT SCREEN WITH LOGO & NEW ID LOGIC --- */
          <div className="no-chat">
              
              {/* 1. Centered Large Logo (Replaces Shield) */}
              <div className="center-brand">
                  <h1 className="logo-text large">MSG</h1>
                  <p className="logo-tagline">Secure. Ephemeral. Private.</p>
              </div>
              
              <h1>Welcome, {myId}!</h1>
              
              {/* 2. Updated ID Logic: Instruction Label + Click to Copy ONLY ID */}
              <p className="id-instruction">Click to copy your unique ID</p>
              
              <div 
                className="welcome-id-pill" 
                onClick={() => {
                   navigator.clipboard.writeText(myFriendCode); 
                   alert("ID Copied!");
                }}
                title="Click to copy ID"
              >
                  <span className="highlight-id">{myFriendCode}</span> <FiCopy style={{marginLeft: "10px"}}/>
              </div>

              {/* Security Cards Grid */}
              <div className="security-grid">
                <div className="security-card encryption">
                  <div className="card-icon">🔒</div>
                  <h4>Client-Side Encryption</h4>
                  <p>Encryption happens locally. Even if our servers are breached, messages remain unreadable.</p>
                </div>
                <div className="security-card timer">
                  <div className="card-icon">⏳</div>
                  <h4>48h Strict Auto-Delete</h4>
                  <p>Data is permanently wiped after 48 hours. No logs, no backups, no traces left behind.</p>
                </div>
                <div className="security-card shield">
                  <div className="card-icon">🛡️</div>
                  <h4>Zero-Knowledge</h4>
                  <p>Private keys never leave your browser. We have mathematically zero access to your chats.</p>
                </div>
              </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default App;