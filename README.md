# MSG: The Messenger That Forgets.

<div align="center">
  <img src="https://github.com/HarshStats/msg/docs/banner.png" alt="MSG Protocol Banner" width="100%" />
</div>

<br />

<div align="center">

  # MSG: The Messenger That Forgets.

  ![Version](https://img.shields.io/github/v/release/HarshStats/msg?style=for-the-badge&color=00bcd4)
  ![License](https://img.shields.io/github/license/HarshStats/msg?style=for-the-badge&color=00e676)
  ![Status](https://img.shields.io/badge/Status-Mainnet_Live-success?style=for-the-badge)

  **The world's first truly anonymous, zero-knowledge messaging layer.** *No phone numbers. No emails. No metadata. Just mathematics.*

  [**Launch App**](https://msg-amber.vercel.app/) • [**Read Whitepaper**](./MSG__Technical_Documentation.pdf) • [**Report Bug**](https://github.com/HarshStats/msg/issues)

</div>

---

## 🚀 Download & Access

| **Platform** | **Status** | **Action** |
| :--- | :--- | :--- |
| **🌐 Web Portal** | `Live` | [**Launch Web App**](https://msg-amber.vercel.app/) |
| **🤖 Android** | `v2.0.0` | [**Download APK**](https://github.com/HarshStats/msg/releases/latest) |
| **📄 Whitepaper** | `Technical` | [**View Documentation**](./MSG__Technical_Documentation.pdf) |

---

## ⚡ What is MSG?

**MSG** is an open-source communication protocol built on a **"Blind Relay" architecture**. Unlike Signal or Telegram, which still require phone numbers and store user metadata, MSG is **identity-agnostic**.

We do not know who you are. We do not know who you are talking to. We cannot read your messages even if we wanted to.

### 🔥 Key Features
* **👻 Zero Metadata:** We log nothing. No IPs, no timestamps, no sender IDs.
* **🛡️ End-to-End Encrypted:** AES-256-GCM + ECDH P-256 key exchange happens locally.
* **☢️ The Nuke Protocol:** One-click panic button that wipes data from **both** devices instantly.
* **📹 P2P Video:** WebRTC streams bypass our servers entirely (Direct Mesh).
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

### 1. Clone the Repo
```bash
git clone [https://github.com/HarshStats/msg.git](https://github.com/HarshStats/msg.git)
cd msg

## 🤝 Contributing

We welcome security audits and feature contributions.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.