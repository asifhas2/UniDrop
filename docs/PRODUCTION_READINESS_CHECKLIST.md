# UniDrop — Production Readiness Checklist

**Status Tracking:** `NOT STARTED` | `IN PROGRESS` | `BLOCKED` | `PASS` | `FAIL`  
**Target:** 1,000 Concurrent Student Lab Users  
**Last Verified:** October 2026  

---

## 1. Error Handling & Validation
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Client-side form & PIN validation with accessible field error indicators | PASS | Implemented in `client/src/pages/JoinPage.jsx` and `LabModePage.jsx` |
| Server-side Zod schema enforcement | PASS | Verified in `server/src/validators/` |
| Central Express error handling middleware returning standardized JSON | PASS | Verified in `server/src/middleware/errorHandler.js` |
| Zero sensitive leaks (no stack traces, database strings, or tokens in errors) | PASS | Verified via test suite and Winston secret sanitizer |
| Network offline & session timeout alert banners | PASS | Implemented in `SessionContext.jsx` and countdown listeners |
| React Error Boundary to catch UI rendering crashes | PASS | Implemented in `client/src/components/ErrorBoundary.jsx` |

---

## 2. Security, Authentication & Secrets
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Zero secrets in Git or frontend code (`VITE_` variables audited) | PASS | Audited in `.gitignore`, `.env.example`, and clean git history |
| Session pairing tokens hashed with SHA-256 before DB insertion | PASS | Verified in `SessionService.js` and automated tests |
| Numeric PIN brute force rate-limiting (max 5 attempts per session) | PASS | Verified in `SessionService.js` (locks session after 5 failed attempts) |
| Admin authentication with bcrypt cost >= 12 and signed HTTP-only JWTs | PASS | Verified in `adminAndTransfer.test.js` (200 OK with valid JWT, 401 on bad credentials) |
| Strict CORS origin validation & Helmet security headers | PASS | Verified in `server/src/app.js` |
| Unrestricted file upload defense (MIME validation, no path traversal) | PASS | Verified in `uploadMiddleware.js` and `fileUtils.js` |
| Auto-shredding & TTL deletion of temporary files & expired sessions | PASS | Verified in `transferService.js` and `cleanupJob.js` |

---

## 3. WebRTC & Transfer Engine
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Genuine WebRTC offer/answer/ICE exchange via Socket.IO | PASS | Implemented in `client/src/services/webrtc.js` and `signalingHandler.js` |
| Chunked 64KB DataChannel file transfer with backpressure management | PASS | Implemented with `bufferedAmountLowThreshold` in `WebRTCManager` |
| Multi-file selection, cancellation, and retry capabilities | PASS | Implemented in `TransferPage.jsx` and `webrtc.js` |
| Automatic failover to server-mediated temporary relay | PASS | Verified in `SessionContext.jsx` and `transferService.js` |

---

## 4. Administrative Oversight
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Lab Computer register/management & kiosk mode locking | PASS | Verified in `adminController.js` and `AdminDashboardPage.jsx` |
| Live telemetry (online computers, active sessions, storage usage) | PASS | Verified via `/api/admin/dashboard` test suite |
| System settings configuration (file size caps, TTLs, MIME whitelists) | PASS | Verified in `SystemSetting.js` and `adminService.js` |
| Security audit log viewing with zero personal data leakage | PASS | Verified in `AuditLog.js` with anonymized IP hashes |

---

## 5. Performance & Load Readiness
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Safe `/health` endpoint with uptime, memory, and database status | PASS | Verified in `session.test.js` (200 OK, db: connected) |
| Staged load testing script (100, 250, 500, up to 1000 virtual users) | PASS | Script created and verified in `tests/load/run-load-test.js` |
| Database indexes on `sessionId`, `expiresAt`, `labComputerId` | PASS | Mongoose schemas verified with compound and TTL indexes |
| Graceful server shutdown on SIGTERM / SIGINT | PASS | Verified in `server/src/server.js` |

---

## 6. Git Hygiene & CI / Automation
| Check | Status | Verification Evidence / Owner |
| :--- | :--- | :--- |
| Initialized Git repository with clean commits | PASS | Git repository initialized with atomic commits |
| Automated integration tests for session, auth, pairing, and transfers | PASS | 13/13 test suites passing in Jest |
| GitHub Actions CI workflow for linting, testing, and building | PASS | Configured in `.github/workflows/ci.yml` |
| Comprehensive setup, deployment, and backup recovery documentation | PASS | Complete documentation in `README.md` and `docs/` |
