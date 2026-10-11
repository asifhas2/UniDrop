# UniDrop — External Services Setup Report

Maintainer: Senior Systems Architect  
Last Updated: October 2026  

---

## 1. Overview
UniDrop is engineered with a **zero-lock-in, self-reliant architecture**. For local development and intranet university deployment, it operates with **no mandatory paid external services**. When transitioning to cloud deployment, the following optional or managed services may be utilized.

---

## 2. External Services Breakdown

### 2.1 MongoDB Database Service (Required in Production)
* **Service:** MongoDB Atlas (Managed Cloud) or Self-Hosted MongoDB Community Server.
* **Purpose:** Stores ephemeral session metadata, lab computer registry, admin credentials, audit logs, and system policies.
* **Required/Optional:** 
  * *Local Development:* Optional (UniDrop features an automatic fallback to `mongodb-memory-server` for zero-setup execution).
  * *Production:* Required.
* **Account / Resource Owner:** University Systems Administrator / Project Owner.
* **Credentials Needed:** `MONGODB_URI` (connection string containing cluster host, database name, and authenticated username/password).
* **Setup Steps (Atlas):**
  1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
  2. Create a free shared cluster (M0 Sandbox).
  3. Under **Database Access**, create a least-privilege user (`unidrop_app`) with read/write access strictly to the `unidrop` database.
  4. Under **Network Access**, whitelist university server IP addresses (or `0.0.0.0/0` with IP restricted hosting).
  5. Copy the standard connection string format into the server's `.env` as `MONGODB_URI`.
* **Cost:** $0.00 / month (Free M0 tier up to 512MB storage, ample for thousands of session records due to aggressive TTL expiration).
* **Verification Steps:** Run `npm run test` or check server boot log for `[Database] Connected successfully to MongoDB`.
* **Compromise Rotation:** If compromised, immediately generate a new database user password in Atlas, update `.env` on production servers, and delete the prior database user.

---

### 2.2 STUN Service (Required for WebRTC NAT Discovery)
* **Service:** Public Google STUN (`stun:stun.l.google.com:19302`).
* **Purpose:** Allows peers behind standard NAT routers to discover their public-facing IP/port candidates to establish direct P2P DataChannels.
* **Required/Optional:** Required for cross-network WebRTC.
* **Credentials Needed:** None (Anonymous public STUN protocol).
* **Cost:** $0.00 / free.
* **Verification Steps:** Check browser console during peer pairing for `[WebRTC] ICE candidate gathered`.

---

### 2.3 TURN Relay Service (Optional / Fallback)
* **Service:** Built-in UniDrop Chunked Server Relay or Self-Hosted Coturn.
* **Purpose:** Transfers data when both peers reside behind strict/symmetric NATs blocking direct UDP traversal.
* **Required/Optional:** Optional. UniDrop contains a built-in HTTPS chunked streaming relay fallback that automatically engages if WebRTC cannot be negotiated within 8 seconds.
* **Cost:** $0.00 (leveraging the primary Node.js server).

---

### 2.4 Monitoring & Error Tracking (Optional)
* **Service:** Winston Structured File/Console Logging (Default) or Sentry.
* **Purpose:** Production diagnostic logging and alert dispatching.
* **Required/Optional:** Optional.
* **Credentials Needed:** `SENTRY_DSN` (if Sentry enabled).
* **Local Alternative:** Built-in structured logs with request correlation IDs and Prometheus `/health` telemetry.
* **Cost:** $0.00.
