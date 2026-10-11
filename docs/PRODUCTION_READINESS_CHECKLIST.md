# UniDrop — Production Readiness Checklist

**Status Tracking:** `NOT STARTED` | `IN PROGRESS` | `BLOCKED` | `PASS` | `FAIL`  
**Target:** 1,000 Concurrent Student Lab Users  

---

## 1. Error Handling & Validation
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Client-side form & PIN validation with accessible field error indicators | IN PROGRESS | React client form components (Phase 4/7) |
| Server-side Zod / express-validator schema enforcement | IN PROGRESS | Backend request validator middleware |
| Central Express error handling middleware returning standardized JSON | IN PROGRESS | `src/middleware/errorHandler.js` |
| Zero sensitive leaks (no stack traces, database strings, or tokens in errors) | IN PROGRESS | Verified in production error handler |
| Network offline & session timeout alert banners | IN PROGRESS | Client connectivity listener & Socket.IO reconnect |
| React Error Boundary to catch UI rendering crashes | IN PROGRESS | Client root ErrorBoundary |

---

## 2. Security, Authentication & Secrets
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Zero secrets in Git or frontend code (`VITE_` variables audited) | PASS | Audited in `.gitignore` and `.env.example` |
| Session pairing tokens hashed with SHA-256 before DB insertion | IN PROGRESS | `src/models/Session.js` & SessionService |
| Numeric PIN brute force rate-limiting (max 5 attempts per session) | IN PROGRESS | Rate limiter in `src/middleware/rateLimiter.js` |
| Admin authentication with bcrypt cost >= 12 and signed HTTP-only JWTs | IN PROGRESS | `src/controllers/adminController.js` |
| Strict CORS origin validation & Helmet security headers | IN PROGRESS | Server configuration |
| Unrestricted file upload defense (MIME validation, no path traversal) | IN PROGRESS | Multer storage & validator |
| Auto-shredding & TTL deletion of temporary files & expired sessions | IN PROGRESS | Scheduled cleanup job & MongoDB TTL index |

---

## 3. WebRTC & Transfer Engine
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Genuine WebRTC offer/answer/ICE exchange via Socket.IO | IN PROGRESS | WebRTC signaling service (Phase 5) |
| Chunked 64KB DataChannel file transfer with backpressure management | IN PROGRESS | WebRTC data channel engine |
| Multi-file selection, cancellation, and retry capabilities | IN PROGRESS | Transfer UI & worker queue |
| Automatic failover to server-mediated temporary relay | IN PROGRESS | Relay fallback controller |

---

## 4. Administrative Oversight
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Lab Computer register/management & kiosk mode locking | IN PROGRESS | Admin lab computers module |
| Live telemetry (online computers, active sessions, storage usage) | IN PROGRESS | Admin dashboard endpoints |
| System settings configuration (file size caps, TTLs, MIME whitelists) | IN PROGRESS | Admin settings controller |
| Security audit log viewing with zero personal data leakage | IN PROGRESS | AuditLog query service |

---

## 5. Performance & Load Readiness
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Safe `/health` endpoint with uptime, memory, and database status | IN PROGRESS | Health controller |
| Staged load testing script (100, 250, 500, up to 1000 virtual users) | NOT STARTED | k6 / Artillery scripts in `tests/load/` |
| Database indexes on `sessionId`, `expiresAt`, `labComputerId` | IN PROGRESS | Mongoose schema definitions |
| Graceful server shutdown on SIGTERM / SIGINT | IN PROGRESS | Server lifecycle handler |

---

## 6. Git Hygiene & CI / Automation
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Initialized Git repository with clean commits | PASS | Git repo initialized, `.gitignore` committed |
| Automated integration tests for session, auth, pairing, and transfers | NOT STARTED | Jest + Supertest in `tests/` |
| GitHub Actions CI workflow for linting, testing, and building | IN PROGRESS | `.github/workflows/ci.yml` |
| Comprehensive setup, deployment, and backup recovery documentation | IN PROGRESS | `README.md` and documentation suite |
