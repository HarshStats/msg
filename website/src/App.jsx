import React from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { 
  FiLock, FiEyeOff, FiGlobe, FiCpu, FiShield, FiZap, 
  FiGithub, FiCheck, FiX, FiCode, FiServer, FiRefreshCw, FiLayers,
  FiSmartphone, FiTrendingUp // ✅ Changed to safe icons that definitely exist
} from "react-icons/fi";
import "./App.css";

// 🔗 CONFIGURATION
const WEB_APP_URL = "https://msg-p0th.onrender.com"; 
const ANDROID_APK_URL = "https://your-server.com/msg-app.apk"; 

// ANIMATION VARIANTS
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

function App() {
  return (
    <div className="app-wrapper">
      {/* BACKGROUND MESH */}
      <div className="background-mesh">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

{/* NAVBAR */}
      <nav className="navbar">
        <div className="container nav-inner">
          {/* FIX 1: Clickable Logo (Scrolls to top) */}
          <a 
            href="#" 
            className="logo" 
            onClick={(e) => { 
              e.preventDefault(); 
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }}
          >
            MSG
          </a>

          <div className="nav-items">
            <a href="#features" className="nav-link">Architecture</a>
            <a href="#comparison" className="nav-link">Security</a>
            <a href="#network" className="nav-link">Network</a>
            <a href="https://github.com/HarshStats/msg" target="_blank" rel="noopener noreferrer" className="nav-link"><FiGithub /> Source</a>
          </div>

          {/* FIX 2: Relative link (Works on deployment) */}
          <a href="#network" className="nav-btn">Get App</a>
        </div>
      </nav>
      {/* HERO SECTION */}
      <section className="hero-section container">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeInUp} className="pill">
            <span className="status-dot"></span> V 2.0.0 — Web & Android App LIVE
          </motion.div>
          <motion.h1 variants={fadeInUp} className="hero-title">
            The Messenger<br />
            <span className="text-highlight">That Forgets.</span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="hero-desc">
The world's first zero-knowledge messaging layer. Ephemeral by design. Anonymous by default. We hold no memories and leave zero digital footprint. No phone numbers. No emails. Just mathematics.
          </motion.p>
          <motion.div variants={fadeInUp} className="hero-btns">
            <a href="#network" className="btn-primary">Start Encrypted Chat</a>
          </motion.div>
        </motion.div>
      </section>

      {/* ADVANCED BENTO GRID (10 CARDS) */}
      <section id="features" className="bento-section container">
        <motion.div 
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="section-header"
        >
          <h2 className="text-gradient section-title">The Privacy Stack</h2>
          <p className="section-subtitle">Engineered for the paranoid. Open to everyone.</p>
        </motion.div>

        <div className="bento-grid">
          {/* Card 1: Encryption (Span 2) */}
          <motion.div whileHover={{ y: -5 }} className="bento-card span-2">
            <div className="card-content">
              <div className="icon-wrapper"><FiLock /></div>
              <h3 className="bento-title">End-to-End Encrypted</h3>
              <p className="bento-text">
                AES-256-GCM + ECDH P-256 key exchange occurs locally. 
                The server acts as a blind relay, seeing only encrypted packets.
              </p>
            </div>
            <div className="code-preview">
              <span className="code-purple">const</span> <span className="code-blue">sharedSecret</span> = <span className="code-cyan">await</span> ecdh.<span className="code-yellow">derive</span>(privKey, pubKey);<br/>
              <span className="code-comment">// Private keys never leave localStorage</span>
            </div>
          </motion.div>

          {/* Card 2: Zero Metadata */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiEyeOff /></div>
            <h3 className="bento-title">Zero Metadata</h3>
            <p className="bento-text">
              We don't log timestamps, IP addresses, or sender IDs. 
              If we get subpoenaed, we have mathematically nothing to show.
            </p>
          </motion.div>



          {/* Card 3: P2P Video */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiGlobe /></div>
            <h3 className="bento-title">P2P Video</h3>
            <p className="bento-text">
              WebRTC streams bypass our servers completely. 
              Direct device-to-device connection for absolute privacy.
            </p>
          </motion.div>

          {/* Card 10: Nuke Protocol (Span 2) */}
          <motion.div whileHover={{ y: -5 }} className="bento-card span-2">
            <div className="card-content">
              <div className="icon-wrapper alert"><FiCpu /></div>
              <h3 className="bento-title">The Nuke Protocol</h3>
              <p className="bento-text">
                One button wipes the conversation from BOTH devices instantly. 
                Plus, an automatic 48-hour self-destruct timer runs on all data.
              </p>
            </div>
            <div className="code-preview alert-border">
              <span className="code-red">&gt; SYSTEM_ALERT: NUKE_INITIATED</span><br/>
              <span className="code-red">&gt; TARGET: ALL_LOCAL_DATA</span><br/>
              <span className="code-red">&gt; STATUS: PURGED [100%]</span>
            </div>
          </motion.div>

          {/* Card 4: Open Source */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiCode /></div>
            <h3 className="bento-title">100% Open Source</h3>
            <p className="bento-text">
              Proprietary security is no security. Verify our encryption implementation yourself on GitHub.
            </p>
          </motion.div>

           {/* Card 5: Network Agnostic */}
           <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiServer /></div>
            <h3 className="bento-title">Network Agnostic</h3>
            <p className="bento-text">
              Works seamlessly over VPNs and Mesh networks. No central IP blocking mechanisms.
            </p>
          </motion.div>

          {/* Card 6: Forward Secrecy */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiRefreshCw /></div>
            <h3 className="bento-title">Forward Secrecy</h3>
            <p className="bento-text">
               New session keys are generated for every chat session. Compromising one key does not compromise past messages.
            </p>
          </motion.div>

          {/* Card 7: Tor Ready */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiLayers /></div>
            <h3 className="bento-title">Tor Ready</h3>
            <p className="bento-text">
              Our lightweight client loads instantly in Tor Browser for maximum anonymity layer routing.
            </p>
          </motion.div>

          {/* Card 8: Biometric Sentinel */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiSmartphone /></div> {/* ✅ Safe Icon */}
            <h3 className="bento-title">Biometric Lock</h3>
            <p className="bento-text">
              Optional local locking. Encryption keys are wiped from memory when backgrounded. Unlock with FaceID.
            </p>
          </motion.div>

          {/* Card 9: Deniable Auth */}
          <motion.div whileHover={{ y: -5 }} className="bento-card">
            <div className="icon-wrapper"><FiTrendingUp /></div> {/* ✅ Safe Icon */}
            <h3 className="bento-title">Deniable Auth</h3>
            <p className="bento-text">
               Messages are authenticated during transit but forged proofs can be created later, giving you plausible deniability.
            </p>
          </motion.div>

          
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section id="comparison" className="comparison-section">
        <div className="container">
          <h2 className="text-gradient section-title centered">Privacy by Design</h2>
          
          <div className="table-wrapper">
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="highlight-col">MSG</th>
                  <th>Signal</th>
                  <th>WhatsApp</th>
                  <th>Telegram</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Registration</td>
                  <td className="highlight-col"><FiCheck className="check" /> Anonymous ID</td>
                  <td><FiX className="cross" /> Phone Number</td>
                  <td><FiX className="cross" /> Phone Number</td>
                  <td><FiX className="cross" /> Phone Number</td>
                </tr>
                <tr>
                  <td>Default Encryption</td>
                  <td className="highlight-col"><FiCheck className="check" /> Always On</td>
                  <td><FiCheck className="check" /> Always On</td>
                  <td><FiCheck className="check" /> Always On</td>
                  <td><FiX className="cross" /> Manual (Secret Chat)</td>
                </tr>
                <tr>
                  <td>Metadata Storage</td>
                  <td className="highlight-col"><FiCheck className="check" /> Zero</td>
                  <td><FiCheck className="check" /> Minimized</td>
                  <td><FiX className="cross" /> Extensive</td>
                  <td><FiX className="cross" /> Extensive</td>
                </tr>
                <tr>
                  <td>Server History</td>
                  <td className="highlight-col"><FiCheck className="check" /> 48h RAM Only</td>
                  <td><FiCheck className="check" /> Queue Only</td>
                  <td><FiX className="cross" /> Cloud Backups</td>
                  <td><FiX className="cross" /> Permanent Cloud</td>
                </tr>
                {/* Feature: Routing Architecture */}
                <tr className="comp-row">
                  <td>Routing Architecture</td>
                  <td className="highlight-col"><FiCheck className="check" /> P2P (Direct)</td>
                  <td><FiX className="cross" /> Centralized</td>
                  <td><FiX className="cross" /> Centralized</td>
                  <td><FiX className="cross" /> Centralized</td>
                </tr>

                {/* Feature: Client Code Transparency */}
                <tr className="comp-row">
                  <td>Client Code</td>
                  <td className="highlight-col"><FiCheck className="check" /> 100% Open Source</td>
                  <td><FiCheck className="check" /> Open Source</td>
                  <td><FiX className="cross" /> Proprietary</td>
                  <td><FiX className="cross" /> Client Only</td>
                </tr>

                {/* Feature: Web Access */}
                <tr className="comp-row">
                  <td>Web Access</td>
                  <td className="highlight-col"><FiCheck className="check" /> Native (Standalone)</td>
                  <td><FiX className="cross" /> Linked App Only</td>
                  <td><FiX className="cross" /> Linked Device</td>
                  <td><FiCheck className="check" /> Native</td>
                </tr>

                {/* Feature: Data Jurisdiction */}
                <tr className="comp-row">
                  <td>Data Jurisdiction</td>
                  <td className="highlight-col"><FiCheck className="check" />EU  Law</td>
                  <td><FiX className="cross" /> US Law</td>
                  <td><FiX className="cross" /> US Law</td>
                  <td><FiX className="cross" /> UAE / Mixed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TERMINAL / LAPTOP SECTION (Network) */}
      <section id="network" className="terminal-section container">
        <div className="section-header">
          <h2 className="text-gradient section-title">Access Point</h2>
          <p className="section-subtitle">Select your gateway to establish a secure connection.</p>
        </div>

        <div className="terminal-box">
          <div className="terminal-header">
            <div className="dot red"></div>
            <div className="dot yellow"></div>
            <div className="dot green"></div>
            <span className="terminal-title">bash — secure_gateway</span>
          </div>
          <div className="terminal-content">
             
             {/* Web Card */}
             <div className="qr-block">
                <div className="qr-frame">
                   <QRCode value={WEB_APP_URL} size={150} />
                </div>
                <div className="qr-info">
                   <h3>Web Portal</h3>
                   <p>No Install Required</p>
                </div>
                <a href="https://msg-amber.vercel.app/" target="_blank" rel="noopener noreferrer" className="btn-primary full-width">Launch Web</a>
             </div>

             {/* Android Card */}
             <div className="qr-block">
                <div className="qr-frame">
                   <QRCode value={ANDROID_APK_URL} size={150} />
                </div>
                <div className="qr-info">
                   <h3>Android APK</h3>
                   <p>Native Performance</p>
                </div>
                <a href="https://github.com/HarshStats/msg/releases/download/v2.0.0/v2.0.0-msg.apk" className="btn-primary full-width android-btn">Download APK</a>
             </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>MSG</h3>
              <p>
                An open-source initiative to reclaim digital privacy. 
                Built by developers for those who value silence.
              </p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="https://msg-amber.vercel.app#" target="_blank" rel="noopener noreferrer">Web App</a>
              <a href="https://github.com/HarshStats/msg/releases/download/v2.0.0/v2.0.0-msg.apk" target="_blank" rel="noopener noreferrer">Android App</a>
              <a href="https://github.com/HarshStats/msg/releases/tag/v2.0.0" target="_blank" rel="noopener noreferrer">Release Notes</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="https://github.com/HarshStats/msg/blob/main/docs/MSG__Technical_Documentation.pdf" target="_blank" rel="noopener noreferrer">Whitepaper</a>
              <a href="https://github.com/HarshStats/msg" target="_blank" rel="noopener noreferrer">GitHub Repo</a>
            </div>
            
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} MSG. Open Source MIT License.</span>
          <div className="footer-socials">
            {/* Link to your GitHub Repo */}
            <a href="https://github.com/HarshStats/msg" target="_blank" rel="noopener noreferrer" style={{color: "inherit"}}>
              <FiGithub />
            </a>

            {/* Link to Releases or 'Powered By' */}
            <a href="https://github.com/HarshStats/msg/releases" target="_blank" rel="noopener noreferrer" style={{color: "inherit"}}>
              <FiZap />
            </a>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;