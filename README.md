# UniDrop — Secure QR-Based Peer-to-Peer File Transfer System for University Computer Labs

UniDrop is a production-grade, zero-login, ephemeral browser-to-browser file transfer platform designed specifically for university computer laboratories.

Students can effortlessly move PDFs, project code, archives, datasets, and presentations between public lab workstations and personal smartphones or laptops without logging into personal email or messaging services, and without plugging in vulnerable USB thumb drives.

---

## 🌟 Key Features

* **Zero Personal Accounts Required:** No registration or password required for students. Sessions are identified by cryptographically generated UUIDs.
* **Lab Workstation Mode (Kiosk UI):** Lab computers generate a short-lived pairing session with high-visibility QR code display, an alternative 6-digit numeric PIN, and a real-time countdown timer.
* **Direct WebRTC DataChannel Streaming:** Files are transferred directly browser-to-browser in 64 KB chunks over encrypted WebRTC DataChannels with backpressure management. Transferred files never touch server storage during P2P transfers.
* **Automated Server-Mediated Relay Fallback:** If university firewalls or symmetric NATs prevent direct WebRTC connections, the system smoothly falls back to an encrypted chunked server relay with quota enforcement and immediate file shredding upon download.
* **Security & Ephemerality:** 
  * Pairing tokens are hashed with SHA-256 before database insertion.
  * PIN brute-force rate limiting locks sessions after 5 failed attempts.
  * Ephemeral sessions expire strictly via MongoDB TTL indexes and scheduled background reaper jobs.
  * Executable file types (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.ps1`) are blocked by security policy.
* **Administrative Governance Portal:** Lab managers can register lab computers, oversee active sessions, terminate sessions forcefully, configure file size/TTL limits, and inspect audit logs without viewing private file contents.

---

## 🏗️ Architecture & Technology Stack

* **Frontend:** React 19, Tailwind CSS v4, Lucide React, React Router v7, QRCode, Socket.IO Client, Axios.
* **Backend:** Node.js, Express.js, Socket.IO, Mongoose, Helmet, Multer, Winston, JSON Web Tokens (JWT), Bcrypt, Zod.
* **Database:** MongoDB with Mongoose (compatible with MongoDB Atlas free tier; includes automated `mongodb-memory-server` fallback for zero-configuration local execution).
* **Testing & Quality:** Jest, Supertest, automated load benchmark harness (`tests/load/run-load-test.js`), and GitHub Actions CI pipeline.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Node.js:** v20.x or v22.x
* **npm:** v10.x or higher

### 2. Installation
Clone the repository and install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration
A ready-to-run `.env` file is generated at the project root based on `.env.example`.
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Leave empty for zero-setup automatic in-memory MongoDB, or provide MongoDB Atlas URI:
MONGODB_URI=

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=UniDropAdmin2026!
```

### 4. Running the Development Servers
From the root directory, you can start both the backend server and frontend client concurrently:

```bash
# Terminal 1: Run Backend API & WebSocket Signaling
npm --prefix server run dev

# Terminal 2: Run Frontend React Vite Client
npm --prefix client run dev
```

* Frontend UI: [http://localhost:5173](http://localhost:5173)
* Backend API Gateway: [http://localhost:5000](http://localhost:5000)
* Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)
* Admin Login: [http://localhost:5173/admin](http://localhost:5173/admin) *(Default credentials: `admin` / `UniDropAdmin2026!`)*

---

## 🧪 Testing & Verification

### Running Automated Integration Tests
UniDrop features full end-to-end integration tests covering health checks, temporary session creation, QR pairing, PIN fallback, rate-limiting brute force rejection, session termination, admin JWT authorization, and server-mediated relay upload/download:

```bash
cd server
npm test
```

### Running the Load Testing Benchmark
To benchmark server performance under staged concurrency (50, 100, 250, 500, up to 1,000 virtual users):
```bash
# Ensure server is running, then in a separate terminal:
npm run test:load
```

---

## 🔒 Security Best Practices

1. **Zero Secret Leakage:** No database strings, API secrets, or private keys exist in frontend code or Git history.
2. **Path Traversal Defense:** All user-uploaded filenames are strictly sanitized against `../`, directory traversal characters, and null bytes.
3. **DTLS / SCTP Transport:** Direct WebRTC peer connections use standard browser end-to-end encryption.
4. **Ephemerality:** The background reaper job (`jobs/cleanupJob.js`) continuously scans and destroys expired sessions and unlinks lingering temporary files.

---

## 📚 Project Documentation

* [Architecture & System Specification](docs/ARCHITECTURE_SPECIFICATION.md)
* [External Services Setup & Cost Report](docs/EXTERNAL_SERVICES_SETUP.md)
* [Production Readiness Checklist](docs/PRODUCTION_READINESS_CHECKLIST.md)
* [Load Testing & Benchmarks](docs/performance/LOAD_TESTING_REPORT.md)
