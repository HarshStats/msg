import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer"; 
import { 
  FiSearch, FiPaperclip, FiSend, FiMoreVertical, 
  FiArrowLeft, FiUserPlus, FiCopy,
  FiTrash2, FiCornerUpRight, FiX, FiShield, FiImage, FiDownload, FiAlertTriangle,
  FiVideo, FiMic, FiMicOff, FiVideoOff, FiPhone 
} from "react-icons/fi"; 
import { BsCheck2All, BsBookmarkStarFill, BsCircle, BsCheckCircleFill, BsTelephoneFill, BsTelephoneXFill } from "react-icons/bs"; 
import Login from "./Login"; 
import { deriveSharedKey, encryptText, decryptText } from "./crypto"; 
import "./App.css";

// 🚀 LIVE SERVER URL (Render)
const SERVER_URL = "https://msg-p0th.onrender.com"; 

// SOUNDS
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3";
const RINGTONE_SOUND = "https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3"; 

const playSound = (url, loop = false) => {
  const audio = new Audio(url);
  if(loop) audio.loop = true;
  audio.volume = 0.5;
  audio.play().catch(e => console.error("Audio blocked", e));
  return audio;
};

// COMPRESSION
const compressImage = (file, quality = 0.7, maxWidth = 1000) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
        };
    });
};

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
  
  // MAIN STATES
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false); 
  const [viewingImage, setViewingImage] = useState(null);
  const [nukeCount, setNukeCount] = useState(0); 
  const [theme, setTheme] = useState("dark");

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const myFriendCode = localStorage.getItem("my_friend_code") || "Loading...";

  // CALLING STATES
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false); 
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [decryptedCache, setDecryptedCache] = useState({});
  const sharedKeysCache = useRef({}); 
  const scrollRef = useRef();
  const selectedUserRef = useRef(null);
  const fileInputRef = useRef(null); 
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const ringtoneRef = useRef(null); 

  useEffect(() => { selectedUserRef.current = selectedUser; setNukeCount(0); }, [selectedUser]);
  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  const getAvatar = (seed) => {
      const bg = theme === 'dark' ? '003344' : 'e0f7fa';
      const text = theme === 'dark' ? '00bcd4' : '006064';
      return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=${bg}&textColor=${text}&fontWeight=700`;
  };

  // --- 1. SETUP SOCKET ---
  useEffect(() => {
    const newSocket = io(SERVER_URL, { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on("connect", () => { 
        setIsConnected(true); 
        newSocket.emit("addNewUser", myId); 
    });

    newSocket.on("getOnlineUsers", (users) => setOnlineUsers(users));
    
    // Call Signals
    newSocket.on("callUser", (data) => {
        setReceivingCall(true);
        setCaller(data.from);
        setCallerSignal(data.signal);
        try { ringtoneRef.current = playSound(RINGTONE_SOUND, true); } catch(e) {}
    });

    newSocket.on("callAccepted", (signal) => {
        setCallAccepted(true);
        if(connectionRef.current) connectionRef.current.signal(signal);
    });

    newSocket.on("callFailed", (data) => {
        alert(`❌ Call Failed: ${data.reason}`);
        endCallUI();
    });

    newSocket.on("callEnded", () => {
        endCallUI();
    });

    newSocket.on("getMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== myId) playSound(NOTIFICATION_SOUND); 
      if (selectedUserRef.current?.username !== message.senderId) setNotifications((prev) => [message, ...prev]);
    });

    newSocket.on("chatNuked", ({ target }) => {
        if (target === myId || target === selectedUserRef.current?.username) setMessages(prev => prev.filter(m => m.isSaved));
    });

    return () => newSocket.disconnect();
  }, [myId]);

  // --- 2. CALL FUNCTIONS ---
  const startStream = async () => {
      try {
          const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(currentStream);
          if (myVideo.current) myVideo.current.srcObject = currentStream;
          return currentStream;
      } catch (err) {
          alert("Could not access Camera/Microphone.");
          return null;
      }
  };

  const callUser = async () => {
      const streamData = await startStream();
      if(!streamData) return;

      setIsCalling(true);
      
      try {
          const peer = new Peer({ initiator: true, trickle: false, stream: streamData });

          peer.on("signal", (data) => {
              socket.emit("callUser", {
                  userToCall: selectedUser.username,
                  signalData: data,
                  from: myId,
                  name: myId
              });
          });

          peer.on("stream", (remoteStream) => {
              if (userVideo.current) userVideo.current.srcObject = remoteStream;
          });

          peer.on("error", (err) => {
              console.error("Peer Error:", err);
              endCallUI();
          });

          socket.on("callAccepted", (signal) => {
              setCallAccepted(true);
              peer.signal(signal);
          });

          connectionRef.current = peer;

      } catch (err) {
          alert("Call System Error: " + err.message);
          endCallUI();
      }
  };

  const answerCall = async () => {
      setCallAccepted(true);
      if(ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; } 

      const streamData = await startStream();
      if(!streamData) return;

      const peer = new Peer({ initiator: false, trickle: false, stream: streamData });

      peer.on("signal", (data) => {
          socket.emit("answerCall", { signal: data, to: caller });
      });

      peer.on("stream", (remoteStream) => {
          if (userVideo.current) userVideo.current.srcObject = remoteStream;
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
  };

  const leaveCall = () => {
      setCallEnded(true);
      if (connectionRef.current) connectionRef.current.destroy();
      const target = receivingCall ? caller : selectedUser?.username;
      socket.emit("endCall", { to: target });
      endCallUI();
  };

  const endCallUI = () => {
      if(ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
      if(stream) stream.getTracks().forEach(track => track.stop()); 
      setCallAccepted(false);
      setReceivingCall(false);
      setIsCalling(false);
      setStream(null);
      window.location.reload(); 
  };

  const toggleMute = () => {
      if(stream) {
          stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
          setIsMuted(!stream.getAudioTracks()[0].enabled);
      }
  }

  const toggleVideo = () => {
      if(stream) {
          stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
          setIsVideoOff(!stream.getVideoTracks()[0].enabled);
      }
  }

  // --- 3. FETCH LOGIC ---
  const fetchContacts = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/contacts/${myId}`);
        const data = await res.json();
        setContacts(data || []);
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchContacts();
    const fetchMsgs = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/messages/${myId}`);
            const data = await res.json();
            setMessages(data);
        } catch(e) {}
    };
    fetchMsgs();
  }, [myId]);

  // --- 🔥 THE FIX: CORRECTLY PARSE PUBLIC KEY 🔥 ---
  const getSharedKey = async (otherUser) => {
      if (!otherUser) return null;
      if (sharedKeysCache.current[otherUser.username]) return sharedKeysCache.current[otherUser.username];
      
      // Get MY Private Key (Object)
      const myPrivKeyJwk = JSON.parse(localStorage.getItem(`priv_${myId}`));
      
      // Get THEIR Public Key (Handle String or Object)
      let otherPublicKey = otherUser.publicKey;
      if (typeof otherPublicKey === "string") {
          try {
              otherPublicKey = JSON.parse(otherPublicKey);
          } catch(e) {
              console.error("Failed to parse public key", e);
              return null;
          }
      }

      if (!myPrivKeyJwk || !otherPublicKey) return null;
      
      const key = await deriveSharedKey(myPrivKeyJwk, otherPublicKey);
      sharedKeysCache.current[otherUser.username] = key;
      return key;
  };

  const handleSend = async (content = currentMessage, type = "text", recipient = selectedUser) => {
    if (!content || (typeof content === 'string' && !content.trim()) || !recipient) return;
    const sharedKey = await getSharedKey(recipient);
    let finalPayload = content;
    if (sharedKey) finalPayload = await encryptText(sharedKey, content);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = { senderId: myId, recipientId: recipient.username, text: finalPayload, type: type, time: time };
    socket.emit("sendMessage", messageData);
    setMessages((prev) => [...prev, messageData]); 
    if(recipient === selectedUser && type === "text") setCurrentMessage("");
  };

  const handleFileClick = () => fileInputRef.current.click();
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    try {
        const compressedBase64 = await compressImage(file);
        await handleSend(compressedBase64, "image");
    } catch (err) { console.error("Compression failed", err); }
    e.target.value = null; 
  };

  const handleAddFriend = async () => {
      if(!friendCodeInput) return;
      try {
          const res = await fetch(`${SERVER_URL}/add-contact`, {
              method: "POST", headers: {"Content-Type": "application/json"},
              body: JSON.stringify({ myId, friendCode: friendCodeInput })
          });
          if (res.ok) { setShowAddFriend(false); setFriendCodeInput(""); fetchContacts(); }
      } catch(err) { alert("Error adding friend"); }
  };

  const handleNuke = async () => {
      if (nukeCount < 2) {
          setNukeCount(prev => prev + 1);
          setTimeout(() => setNukeCount(0), 3000); 
      } else {
          try {
              await fetch(`${SERVER_URL}/messages/nuke`, {
                  method: "DELETE", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ myId, otherId: selectedUser.username })
              });
              setMessages(prev => prev.filter(m => m.isSaved));
              setNukeCount(0);
              alert("💥 CHAT NUKED 💥");
          } catch(err) { console.error("Nuke failed", err); }
      }
  };

  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedMsgIds([]); setIsForwarding(false); };
  const handleMessageClick = async (msg) => {
      if (isSelectionMode) {
          if (selectedMsgIds.includes(msg._id)) setSelectedMsgIds(prev => prev.filter(id => id !== msg._id));
          else setSelectedMsgIds(prev => [...prev, msg._id]);
          return;
      }
      if(msg._id) {
          setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isSaved: !m.isSaved } : m));
          await fetch(`${SERVER_URL}/messages/toggle/${msg._id}`, { method: "PUT" });
      }
  };
  const handleDeleteSelected = async () => {
      if(!window.confirm(`Delete ${selectedMsgIds.length} messages?`)) return;
      try {
          await fetch(`${SERVER_URL}/messages`, {
              method: "DELETE", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: selectedMsgIds })
          });
          setMessages(prev => prev.filter(m => !selectedMsgIds.includes(m._id)));
          setIsSelectionMode(false); setSelectedMsgIds([]);
      } catch(e) { console.error("Delete failed", e); }
  };
  const initForwarding = () => { setIsForwarding(true); alert("Select a contact to forward to"); };
  const handleUserClick = async (user) => {
      if (isForwarding) {
          if(!window.confirm(`Forward ${selectedMsgIds.length} messages to ${user.username}?`)) return;
          for (let msgId of selectedMsgIds) {
              const rawText = decryptedCache[msgId]; 
              const originalMsg = messages.find(m => m._id === msgId);
              if (rawText && originalMsg) await handleSend(rawText, originalMsg.type || "text", user);
          }
          setIsForwarding(false); setIsSelectionMode(false); setSelectedMsgIds([]); setSelectedUser(user); 
          return;
      }
      setSelectedUser(user);
      setNotifications((prev) => prev.filter((n) => n.senderId !== user.username));
      setIsSelectionMode(false); 
  };

  // --- 🔥 FIXED DECRYPTION LOOP 🔥 ---
  useEffect(() => {
      const processMessages = async () => {
          const newCache = { ...decryptedCache };
          let updated = false;

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
                          updated = true;
                      }
                  }
              }
          }
          if (updated) setDecryptedCache(newCache);
      };
      
      if (messages.length > 0 && selectedUser) processMessages();
  }, [messages, selectedUser, contacts]); 

  const filteredContacts = contacts.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentChatMessages = messages.filter(msg => 
      (msg.senderId === myId && msg.recipientId === selectedUser?.username) ||
      (msg.senderId === selectedUser?.username && msg.recipientId === myId)
  );
  
  useEffect(() => { if (!isSelectionMode) scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentChatMessages.length, selectedUser?.username, isSelectionMode]);

  return (
    <div className={`app-container ${theme === "light" ? "light-theme" : ""}`}>
      {/* SIDEBAR */}
      <div className={`sidebar ${selectedUser ? "mobile-hidden" : ""}`}>
        <div className="sidebar-header">
          <div className="brand-container" onClick={toggleTheme} style={{cursor: "pointer"}} title="Toggle Theme">
            <h1 className="logo-text">MSG</h1>
            <p className="logo-tagline">Secure. Ephemeral.</p>
          </div>
          <div className="mini-profile">
             <div className="avatar mini-avatar"><img src={getAvatar(myId)} alt="Me" /></div>
             <span className="online-dot mini-status"></span>
          </div>
        </div>
        {isForwarding ? (
             <div className="forward-header"><h3>Select Recipient</h3><button onClick={() => {setIsForwarding(false); setIsSelectionMode(false)}}>Cancel</button></div>
        ) : (
            <div className="sidebar-tools">
                <div className="search-bar"><FiSearch className="search-icon" /><input type="text" placeholder="Search friends" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <button className="add-friend-btn" onClick={() => setShowAddFriend(!showAddFriend)}><FiUserPlus /> {showAddFriend ? "Close" : "Add Friend"}</button>
                {showAddFriend && (<div className="add-friend-box"><input placeholder="Friend ID" value={friendCodeInput} onChange={e => setFriendCodeInput(e.target.value)} /><button onClick={handleAddFriend}>Add</button></div>)}
            </div>
        )}
        <div className="users-list">
          {filteredContacts.map((user) => {
              const unreadCount = notifications.filter(n => n.senderId === user.username).length;
              return (
              <div key={user._id} className={`user-card ${selectedUser?.username === user.username ? "active" : ""}`} onClick={() => handleUserClick(user)} >
                <div className="avatar"><img src={getAvatar(user.username)} alt="avatar" /></div>
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
                      <div style={{display:"flex", alignItems:"center", gap:"10px", color: "white"}}><FiX className="icon-btn" onClick={toggleSelectionMode} /><span style={{fontWeight:"bold"}}>{selectedMsgIds.length} Selected</span></div>
                      <div style={{display:"flex", gap:"20px"}}>{selectedMsgIds.length > 0 && (<><FiTrash2 className="icon-btn" onClick={handleDeleteSelected} title="Delete" /><FiCornerUpRight className="icon-btn" onClick={initForwarding} title="Forward" /></>)}</div>
                  </div>
              ) : (
                  <>
                    <div className="header-left">
                        <FiArrowLeft className="back-btn icon-btn" onClick={() => setSelectedUser(null)} style={{marginRight: "15px"}}/>
                        <div className="avatar small"><img src={getAvatar(selectedUser.username)} alt="avatar" /></div>
                        <div className="header-info"><h3>{selectedUser.username}</h3><div style={{display:"flex", alignItems:"center", gap:"5px", fontSize: "11px", color: "#00bcd4"}}><FiShield size={10} /> <span>End-to-End Encrypted</span></div></div>
                    </div>
                    <div className="header-icons">
                        <div className="icon-btn" onClick={callUser} title="Start Call"><FiVideo /></div>
                        <div className={`nuke-btn ${nukeCount > 0 ? "active" : ""}`} onClick={handleNuke} title="Nuke Chat"><FiAlertTriangle />{nukeCount > 0 && <span className="nuke-badge">{3 - nukeCount}</span>}</div>
                        <FiMoreVertical onClick={toggleSelectionMode} title="Select Messages" />
                    </div>
                  </>
              )}
            </div>
            
            <div className="messages-box">
              {currentChatMessages.map((msg, index) => {
                const decryptedContent = decryptedCache[msg._id || msg.time];
                const isSelected = selectedMsgIds.includes(msg._id);
                const isImage = msg.type === "image" || (typeof decryptedContent === 'string' && decryptedContent.startsWith("data:image"));
                return (
                    <div key={index} className={`message-wrapper ${msg.senderId === myId ? "own" : "friend"} ${isSelectionMode ? "selectable" : ""}`}>
                        {isSelectionMode && (<div className="selection-checkbox" onClick={() => handleMessageClick(msg)}>{isSelected ? <BsCheckCircleFill color="#00bcd4" size={20}/> : <BsCircle color="#555" size={20}/>}</div>)}
                        <div className={`message-content ${isSelected ? "selected-bubble" : ""}`} onClick={() => handleMessageClick(msg)} style={{cursor: isSelectionMode ? "pointer" : "default"}}>
                            {!decryptedContent ? <p style={{fontStyle:"italic", opacity:0.7}}>🔒 Decrypting...</p> : isImage ? <img src={decryptedContent} alt="Encrypted attachment" className="chat-image" onClick={(e) => { e.stopPropagation(); setViewingImage(decryptedContent); }} /> : <p>{decryptedContent}</p>}
                            <div className="message-meta"><span>{msg.time}</span>{!isSelectionMode && msg.isSaved && <BsBookmarkStarFill style={{marginLeft: "5px", color: "#ffd700"}} />}{!isSelectionMode && msg.senderId === myId && <BsCheck2All className="read-icon" />}</div>
                        </div>
                    </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="chat-input-area">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{display: "none"}} />
              <button className="icon-btn" onClick={handleFileClick} title="Send Image"><FiPaperclip /></button>
              <div className="input-wrapper"><input type="text" placeholder="Type a secured message..." value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={isSelectionMode} /></div>
              <button className="send-btn" onClick={() => handleSend(currentMessage, "text")} disabled={isSelectionMode}><FiSend /></button>
            </div>
          </>
        ) : (
          <div className="no-chat">
              <div className="center-brand"><h1 className="logo-text large">MSG</h1><p className="logo-tagline">Secure. Ephemeral. Private.</p></div>
              <h1>Welcome, {myId}!</h1>
              <p className="id-instruction">Click to copy your unique ID</p>
              <div className="welcome-id-pill" onClick={() => { navigator.clipboard.writeText(myFriendCode); alert("ID Copied!"); }} title="Click to copy ID"><span className="highlight-id">{myFriendCode}</span> <FiCopy style={{marginLeft: "10px"}}/></div>
              <div className="security-grid">
                <div className="security-card encryption"><div className="card-icon">🔒</div><h4>Client-Side Encryption</h4><p>Encryption happens locally. Even if our servers are breached, messages remain unreadable.</p></div>
                <div className="security-card timer"><div className="card-icon">⏳</div><h4>48h Strict Auto-Delete</h4><p>Data is permanently wiped after 48 hours. No logs, no backups, no traces left behind.</p></div>
                <div className="security-card shield"><div className="card-icon">🛡️</div><h4>Zero-Knowledge</h4><p>Private keys never leave your browser. We have mathematically zero access to your chats.</p></div>
              </div>
          </div>
        )}
      </div>

      {/* CALL OVERLAY + WATERMARK */}
      {(receivingCall || isCalling || callAccepted) && !callEnded && (
          <div className="call-overlay">
              <div className="call-box">
                  <div className="video-watermark">
                        Confidential &nbsp; • &nbsp; {myId} &nbsp; • &nbsp; {new Date().toLocaleTimeString()}
                        <br/>
                        {myId} &nbsp; • &nbsp; DO NOT SHARE
                  </div>
                  {receivingCall && !callAccepted ? (
                      <div className="incoming-call">
                          <h3>Incoming Call from {caller}...</h3>
                          <div className="call-actions">
                              <button className="call-btn accept" onClick={answerCall}><BsTelephoneFill /> Answer</button>
                              <button className="call-btn reject" onClick={() => { leaveCall(); window.location.reload(); }}><BsTelephoneXFill /> Reject</button>
                          </div>
                      </div>
                  ) : (
                      <div className="active-call">
                          <div className="video-grid">
                              <video playsInline muted ref={myVideo} autoPlay className="my-video" />
                              {callAccepted && !callEnded && <video playsInline ref={userVideo} autoPlay className="user-video" />}
                          </div>
                          <div className="call-controls">
                              <button className="control-btn" onClick={toggleMute}>{isMuted ? <FiMicOff /> : <FiMic />}</button>
                              <button className="control-btn" onClick={toggleVideo}>{isVideoOff ? <FiVideoOff /> : <FiVideo />}</button>
                              <button className="control-btn hangup" onClick={leaveCall}><BsTelephoneXFill /></button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {viewingImage && (
        <div className="lightbox-overlay" onClick={() => setViewingImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={viewingImage} alt="Full view" className="lightbox-img" />
            <div className="lightbox-controls"><button className="lightbox-btn" onClick={() => setViewingImage(null)}><FiX /> Close</button><a href={viewingImage} download={`secure-image-${Date.now()}.png`} className="lightbox-btn"><FiDownload /> Download</a></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;