# UniDrop — Load & Performance Testing Report

**Author:** Systems QA & Performance Engineering  
**Version:** 2.0  
**Target Goal:** 1,000 Concurrent Virtual Students / Connections  

---

## 1. Load Test Scenarios
The UniDrop architecture was benchmarked against the following key user journeys:
1. **Scenario 1 — Heartbeat & Availability:** Rapid polling of `/api/health` to test gateway overhead and event loop responsiveness.
2. **Scenario 2 — Kiosk Session Generation:** Creation of temporary sessions (`POST /api/sessions`) with 256-bit cryptographic token generation and SHA-256 pairing hashes.
3. **Scenario 3 — Join Handshake:** Rate-limited PIN verification and single-use pairing token consumption.
4. **Scenario 4 — P2P Signaling Relay:** WebSocket event forwarding (SDP Offer, Answer, ICE candidates).
5. **Scenario 5 — Ephemeral Server Relay:** Fallback upload/download stream handling with immediate post-pipe unlinking.

---

## 2. Staged Testing Profile
| Stage | Simulated Virtual Users | Duration | Expected Target Latency (p95) | Pass/Fail Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1 (Baseline)** | 50 Users | 3 seconds | < 50ms | < 100ms, Error Rate < 0.1% |
| **Stage 2** | 100 Users | 5 seconds | < 80ms | < 150ms, Error Rate < 0.5% |
| **Stage 3** | 250 Users | 5 seconds | < 150ms | < 300ms, Error Rate < 1% |
| **Stage 4** | 500 Users | 5 seconds | < 300ms | < 600ms, Error Rate < 2% |
| **Stage 5 (Stress Goal)**| 1,000 Users | 5 seconds | < 600ms | < 1000ms, Error Rate < 5% |

---

## 3. Execution Instructions
To execute the automated benchmark against a local or staging server instance:
```bash
# Terminal 1: Launch the server
npm run server

# Terminal 2: Run the benchmark harness
npm run test:load
```
To run against a staging or deployed server:
```bash
TARGET_URL="https://your-unidrop-deployment.edu" npm run test:load
```
