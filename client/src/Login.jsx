import { useState } from "react";
import "./App.css"; 
import { generateKeyPair } from "./crypto"; // Import the new security helper

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const endpoint = isRegister ? "register" : "login";
    let payload = { username, password };

    // --- REGISTER LOGIC ---
    if (isRegister) {
        try {
            const keys = await generateKeyPair();
            // Save locally for immediate use
            localStorage.setItem(`priv_${username}`, JSON.stringify(keys.privateKey));
            
            // Send BOTH keys to server
            payload.publicKey = keys.publicKey;
            payload.privateKey = keys.privateKey; // NEW: Send backup
        } catch (err) {
            setError("Security setup failed."); return;
        }
    }

    try {
      const res = await fetch(`http://localhost:3000/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.friendCode) localStorage.setItem("my_friend_code", data.friendCode);
        
        // --- LOGIN LOGIC (NEW) ---
        // If server sent back a private key (Login), save it!
        if (data.privateKey) {
            localStorage.setItem(`priv_${data.username}`, JSON.stringify(data.privateKey));
        }

        onLogin(data.username);
      } else {
        setError(data);
      }
    } catch (err) {
      setError("Server error.");
    }
  };
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
        {error && <div className="error-msg">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">
            {isRegister ? "Sign Up & Generate Keys" : "Log In"}
          </button>
        </form>

        <p onClick={() => setIsRegister(!isRegister)} className="toggle-btn">
          {isRegister
            ? "Already have an account? Login"
            : "Don't have an account? Sign Up"}
        </p>
      </div>
    </div>
  );
};

export default Login;