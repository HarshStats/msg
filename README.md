# MSG: The Messenger That Forgets.

<div align="center">
  <a href="https://msg-hmc3.vercel.app">
    <img src="https://github.com/HarshStats/msg/blob/main/docs/banner.png" alt="Banner for MSG Protocol featuring a dark minimalistic background with a neon teal shield icon in the center symbolizing security. The text MSG: The Messenger That Forgets is displayed prominently in bold white font. Below the title, smaller text reads Zero Metadata, End-to-End Encrypted, Identity-Agnostic. The overall tone is sleek, modern, and privacy-focused." width="100%" />
  </a>

</div>

<br />

<div align="center">


  ![Version](https://img.shields.io/github/v/release/HarshStats/msg?style=for-the-badge&color=00bcd4)
  ![License](https://img.shields.io/github/license/HarshStats/msg?style=for-the-badge&color=00e676)
  ![Status](https://img.shields.io/badge/Status-Mainnet_Live-success?style=for-the-badge)

  [**Launch App**](https://msg-amber.vercel.app/) • [**Read Whitepaper**](./MSG__Technical_Documentation.pdf) • [**Report Bug**](https://github.com/HarshStats/msg/issues)

</div>

---

## 🚀 Download & Access

| **Platform** | **Status** | **Action** |
| :--- | :--- | :--- |
| **🏠 Website** | Landing Page & Features | [**Visit Site**](https://msg-hmc3.vercel.app/) |
| **🌐 Web Portal** | `Live` | [**Launch Web App**](https://msg-amber.vercel.app/) |
| **🤖 Android** | `v2.0.0` | [**Download APK**](https://github.com/HarshStats/msg/releases/latest) |
| **📄 Whitepaper** | `Technical` | [**View Documentation**](./MSG__Technical_Documentation.pdf) |

---

## ⚡ What is MSG?

**MSG** is an open-source communication protocol built on a **"Blind Relay" architecture**. Unlike Signal or Telegram, which still require phone numbers and store user metadata, MSG is **identity-agnostic**.

I do not know who you are. I do not know who you are talking to. I cannot read your messages even if I wanted to.

### 🔥 Key Features
* **👻 Zero Metadata:** I log nothing. No IPs, no timestamps, no sender IDs.
* **🛡️ End-to-End Encrypted:** AES-256-GCM + ECDH P-256 key exchange happens locally.
* **☢️ The Nuke Protocol:** One-click panic button that wipes data from **both** devices instantly.
* **📹 P2P Video:** WebRTC streams bypass my servers entirely (Direct Mesh).
* **🧬 Biometric Lock:** (Android) Optional FaceID/Fingerprint lock for the app.
* **🕸️ Tor Ready:** Lightweight web client works seamlessly in Tor Browser.

---

## 🏗️ Architecture

The system is composed of three isolated modules:

1.  **`client/`**: The React-based frontend (PWA) and Android wrapper (Capacitor). Handles all encryption/decryption locally.
2.  **`server/`**: A "dumb" Node.js relay. It holds encrypted binary blobs in RAM for delivery and discards them after 48 hours.
3.  **`website/`**: The public landing page and documentation hub.

### Security Model
* **Keys:** Generated on your device (ECDH P-256). Private keys never leave `localStorage`.
* **Storage:** The server uses MongoDB with a **TTL Index** to auto-delete records after 48h.
* **Routing:** Messages are routed via opaque `friendCode` identifiers, not personal data.

---

## 🛠️ Local Development

Want to run your own private MSG node? Follow these steps.

### Prerequisites
* Node.js v16+
* MongoDB (Local or Atlas)

### Clone the Repo
```bash
git clone [https://github.com/HarshStats/msg.git](https://github.com/HarshStats/msg.git)
cd msg


### Clone the Repo

I welcome security audits and feature contributions.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.