import { useState } from "react";
import { generateKeys } from "./crypto"; 

// 🚀 LIVE SERVER URL (Render)
const SERVER_URL = "https://msg-p0th.onrender.com";

const Login = ({ onLogin }) => {
  // ... (Keep the rest of the file EXACTLY the same)
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { publicKey, privateKey } = await generateKeys();
        
        const res = await fetch(`${SERVER_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username, 
            password, 
            publicKey: JSON.stringify(publicKey), 
            privateKey: JSON.stringify(privateKey) 
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data);

        localStorage.setItem(`priv_${data.username}`, JSON.stringify(privateKey));
        localStorage.setItem("my_friend_code", data.friendCode);
        onLogin(data.username);

      } else {
        const res = await fetch(`${SERVER_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data);

        if (!localStorage.getItem(`priv_${data.username}`)) {
            alert("Warning: New device detected. Old secure messages won't be readable.");
            if(data.privateKey) {
                 localStorage.setItem(`priv_${data.username}`, data.privateKey);
            }
        }
        
        localStorage.setItem("my_friend_code", data.friendCode);
        onLogin(data.username);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Server Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo-text large" style={{fontSize: "3rem", marginBottom: "0"}}>MSG</h1>
        <h3>{isRegistering ? "Secure Registration" : "Welcome Back"}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Processing..." : (isRegistering ? "Create ID" : "Login")}</button>
        </form>
        <div className="toggle-btn" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? "Already have an ID? Login" : "Need a Secure ID? Register"}
        </div>
      </div>
    </div>
  );
};

export default Login;