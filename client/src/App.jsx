import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { 
  FiSearch, FiPaperclip, FiSend, FiMoreVertical, 
  FiPhone, FiVideo, FiArrowLeft, FiUserPlus, FiCopy,
  FiTrash2, FiCornerUpRight, FiX
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
  
  // --- SELECT / DELETE / FORWARD STATE ---
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

  // SEND MESSAGE
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

  // --- SELECTION LOGIC ---
  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedMsgIds([]);
      setIsForwarding(false);
  };

  const handleMessageClick = async (msg) => {
      // IF SELECTING: Toggle Checkbox
      if (isSelectionMode) {
          if (selectedMsgIds.includes(msg._id)) {
              setSelectedMsgIds(prev => prev.filter(id => id !== msg._id));
          } else {
              setSelectedMsgIds(prev => [...prev, msg._id]);
          }
          return;
      }
      
      // IF NORMAL: Toggle Save
      if(msg._id) {
          setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isSaved: !m.isSaved } : m));
          await fetch(`http://localhost:3000/messages/toggle/${msg._id}`, { method: "PUT" });
      }
  };

  // --- DELETE LOGIC ---
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

  // --- FORWARD LOGIC ---
  const initForwarding = () => {
      setIsForwarding(true); 
      alert("Select a contact to forward to");
  };

  const handleUserClick = async (user) => {
      // IF FORWARDING
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

      // NORMAL SWITCH CHAT
      setSelectedUser(user);
      setNotifications((prev) => prev.filter((n) => n.senderId !== user.username));
      setIsSelectionMode(false); 
  };


  // 6. DECRYPTION
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
                          if(msg._id) newCache[msg._id] = text; // Cache by ID for forwarding
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
          {isForwarding ? (
             <div className="forward-header">
                <h3>Select Recipient</h3>
                <button onClick={() => {setIsForwarding(false); setIsSelectionMode(false)}}>Cancel</button>
             </div>
          ) : (
            <>
            <div className="my-profile">
                <div className="avatar">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`} alt="avatar" />
                <span className="online-dot" style={{ background: isConnected ? "#4caf50" : "#ff9800" }}></span>
                </div>
                <div className="my-info">
                <h3>{myId}</h3>
                <div className="copy-code" onClick={() => {navigator.clipboard.writeText(myFriendCode); alert("Copied!")}}>
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
                    <input placeholder="Friend ID" value={friendCodeInput} onChange={e => setFriendCodeInput(e.target.value)} />
                    <button onClick={handleAddFriend}>Add</button>
                </div>
            )}
            </>
          )}
        </div>
        
        <div className="users-list">
          {filteredContacts.map((user) => (
              <div key={user._id} className={`user-card ${selectedUser?.username === user.username ? "active" : ""}`}
                onClick={() => handleUserClick(user)} >
                <div className="avatar">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" />
                </div>
                <div className="user-info">
                  <span className="username">{user.username}</span>
                  {isForwarding && <FiCornerUpRight style={{color: "#0088cc"}} />}
                </div>
              </div>
          ))}
        </div>
        <div className="logout-area"><button onClick={onLogout}>Logout</button></div>
      </div>

      {/* CHAT AREA */}
      <div className={`chat-area ${!selectedUser ? "mobile-hidden" : ""}`}>
        {selectedUser ? (
          <>
            <div className={`chat-header ${isSelectionMode ? "selection-mode" : ""}`}>
              {isSelectionMode ? (
                  <div className="header-left selection-tools" style={{width:"100%", justifyContent:"space-between"}}>
                      <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
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
                        <FiArrowLeft className="back-btn" onClick={() => setSelectedUser(null)} />
                        <div className="avatar small"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`} alt="avatar" /></div>
                        <div className="header-info">
                        <h3>{selectedUser.username}</h3>
                        <span style={{color: "#4caf50", fontSize: "12px"}}>🔒 End-to-End Encrypted</span>
                        </div>
                    </div>
                    <div className="header-icons">
                        <FiMoreVertical onClick={toggleSelectionMode} title="Select Messages" style={{cursor:"pointer"}}/>
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
                                {isSelected ? <BsCheckCircleFill color="#0088cc" size={20}/> : <BsCircle color="#ccc" size={20}/>}
                            </div>
                        )}
                        <div className={`message-content ${isSelected ? "selected-bubble" : ""}`} 
                             onClick={() => handleMessageClick(msg)}
                             style={{cursor: isSelectionMode ? "pointer" : "default"}}
                        >
                            <p>{displayText}</p>
                            <div className="message-meta">
                            <span>{msg.time}</span>
                            {!isSelectionMode && msg.isSaved && <BsBookmarkStarFill style={{marginLeft: "5px", color: "#ff9800"}} />}
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
                <input type="text" placeholder="Message..." value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                  disabled={isSelectionMode} 
                />
              </div>
              <button className="send-btn" onClick={() => handleSend()} disabled={isSelectionMode}><FiSend /></button>
            </div>
          </>
        ) : (
          <div className="no-chat">
             <h3>Welcome {myId}!</h3>
             <p>Your Friend ID: <b>{myFriendCode}</b></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;