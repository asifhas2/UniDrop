# UniDrop — System Architecture & Production Specification

**Project:** UniDrop — Secure QR-Based Peer-to-Peer File Transfer System for University Computer Labs  
**Specification Version:** 2.0 (Production-Ready)  
**Authors:** Senior Full-Stack Software Engineer, Security Architect & Systems QA  

---

## 1. Requirement Analysis, Scope & Assumptions

### 1.1 The Core Problem in University Labs
Students in computer laboratories routinely generate assignments, source code, datasets, diagrams, and project archives on shared lab workstations. To transfer these files to their personal smartphones, tablets, or laptops, students often:
- Log in to personal WhatsApp Web, Telegram, Discord, Google Drive, or Gmail accounts, frequently forgetting to log out or clearing browser history.
- Insert personal USB thumb drives into shared public workstations, exposing the lab to malware and the student's drive to ransomware/viruses.
- Rely on unencrypted temporary file sharing services or third-party web clipboards.

### 1.2 The UniDrop Solution
UniDrop provides a zero-login, temporary, browser-to-browser authenticated transfer bridge:
1. **Lab Workstation (Host/Lab Mode):** Opens UniDrop in "Lab Mode" (e.g. `LAB-PC-14`). A short-lived cryptographic pairing session is initialized, displaying a clean high-contrast QR code and a 6-digit numeric fallback PIN with a visible expiration countdown (e.g., 5:00 minutes).
2. **Student Device (Client):** Scans the QR code (or enters the PIN on `/join`). No user account, registration, or password is required.
3. **Instant Pairing & Real-time Signaling:** A secure WebSocket/Socket.IO handshake authenticates both devices into an isolated private transfer room.
4. **Direct WebRTC DataChannel Transfer:** Files are transferred browser-to-browser over encrypted WebRTC DataChannels using chunked streaming (64 KB chunks) with backpressure management (`bufferedAmountLowThreshold`).
5. **Resilient Server-Mediated Fallback:** If university firewall/NAT configurations prevent direct P2P connections, the transfer smoothly switches to an encrypted, temporary server-mediated relay with strict quota limits and automatic shredding/cleanup upon download or expiry.
6. **Administrative Governance:** Lab managers and system administrators have access to an administrative console to oversee lab computers, manage system security policies (file size ceilings, MIME whitelists, session timeouts), monitor active sessions, and review security audit logs without inspecting file contents.

---

## 2. System Architecture & Data Model

### 2.1 MongoDB Schemas
1. **Session:** `sessionId`, `pairingTokenHash` (SHA-256), `pinCodeHash` (SHA-256), `hostDeviceId`, `connectedDeviceIds`, `status`, `expiresAt` (TTL index).
2. **LabComputer:** `computerId`, `name`, `room`, `status`, `isEnabled`, `currentSessionId`.
3. **Transfer:** `transferId`, `sessionId`, `fileName`, `fileSize`, `mimeType`, `transferMode`, `status`, `progressPercent`, `speedBps`, `expiresAt` (TTL).
4. **AuditLog:** `eventType`, `severity`, `actorId`, `ipAddressHash`, `details`, `timestamp` (TTL index 30 days).
5. **SystemSetting:** `key`, `value`, `category`, `description`.
6. **Admin:** `username`, `email`, `passwordHash` (Bcrypt salt 12), `role`.

---

## 3. Threat Model & Security Controls

* **Brute-Force Protection:** PIN entry is rate-limited and locked after 5 failed attempts per session.
* **Token Hashing:** Raw pairing tokens and PINs are never stored in plain text in the database.
* **Transport Encryption:** WebRTC DataChannels utilize DTLS/SCTP end-to-end encryption.
* **Ephemeral Disk Usage:** Server relay fallback strictly shreds files immediately after client download stream finishes or upon TTL expiration.
* **Path Traversal & MIME Validation:** Filenames are sanitized of directory traversal patterns; dangerous executable formats (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, etc.) are rejected by policy.
