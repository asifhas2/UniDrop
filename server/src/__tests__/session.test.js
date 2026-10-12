import request from 'supertest';
import app from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';

describe('UniDrop API & Session Engine Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('GET /api/health returns 200 with service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services.database).toBe('connected');
  });

  test('POST /api/sessions creates temporary session with QR and PIN', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        hostDeviceId: 'device-host-test-123',
        labComputerId: 'TEST-LAB-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.qrToken).toHaveLength(64);
    expect(res.body.data.pinCode).toMatch(/^\d{6}$/);
    expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('POST /api/sessions/join validates QR token successfully', async () => {
    // 1. Create a session
    const createRes = await request(app)
      .post('/api/sessions')
      .send({ hostDeviceId: 'device-host-qr-test' });

    const { qrToken, sessionId } = createRes.body.data;

    // 2. Join via QR token
    const joinRes = await request(app)
      .post('/api/sessions/join')
      .send({
        sessionId,
        qrToken,
        peerDeviceId: 'student-mobile-peer-1',
      });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.data.status).toBe('paired');
    expect(joinRes.body.data.connectedDeviceIds).toContain('student-mobile-peer-1');
  });

  test('POST /api/sessions/join validates PIN fallback successfully', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .send({ hostDeviceId: 'device-host-pin-test' });

    const { pinCode, sessionId } = createRes.body.data;

    // Join via PIN code
    const joinRes = await request(app)
      .post('/api/sessions/join')
      .send({
        sessionId,
        pinCode,
        peerDeviceId: 'student-laptop-peer-2',
      });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.data.status).toBe('paired');
  });

  test('POST /api/sessions/join rejects invalid PIN with 401', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .send({ hostDeviceId: 'device-host-fail-test' });

    const { sessionId } = createRes.body.data;

    const joinRes = await request(app)
      .post('/api/sessions/join')
      .send({
        sessionId,
        pinCode: '000000', // Invalid PIN
        peerDeviceId: 'attacker-device',
      });

    expect(joinRes.status).toBe(401);
    expect(joinRes.body.success).toBe(false);
  });

  test('POST /api/sessions/:id/disconnect invalidates the session', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .send({ hostDeviceId: 'device-host-dc-test' });

    const { sessionId } = createRes.body.data;

    const dcRes = await request(app)
      .post(`/api/sessions/${sessionId}/disconnect`)
      .send({ deviceId: 'device-host-dc-test' });

    expect(dcRes.status).toBe(200);
    expect(dcRes.body.success).toBe(true);

    // Further get request shows session status expired or 410
    const getRes = await request(app).get(`/api/sessions/${sessionId}`);
    expect(getRes.status).toBe(410);
  });

  test('Group Work Mode: Multiple peers can connect to the same session', async () => {
    // 1. Create a group session
    const createRes = await request(app)
      .post('/api/sessions')
      .send({
        hostDeviceId: 'group-host-pc',
        mode: 'group',
        allowMemberUpload: false,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.mode).toBe('group');
    expect(createRes.body.data.allowMemberUpload).toBe(false);

    const { qrToken, sessionId } = createRes.body.data;

    // 2. Member 1 joins
    const joinRes1 = await request(app)
      .post('/api/sessions/join')
      .send({
        sessionId,
        qrToken,
        peerDeviceId: 'student-member-1',
      });
    expect(joinRes1.status).toBe(200);
    expect(joinRes1.body.data.connectedDeviceIds).toContain('student-member-1');
    expect(joinRes1.body.data.memberCount).toBe(1);

    // 3. Member 2 joins the same group session
    const joinRes2 = await request(app)
      .post('/api/sessions/join')
      .send({
        sessionId,
        qrToken,
        peerDeviceId: 'student-member-2',
      });
    expect(joinRes2.status).toBe(200);
    expect(joinRes2.body.data.connectedDeviceIds).toContain('student-member-2');
    expect(joinRes2.body.data.memberCount).toBe(2);

    // 4. Member 3 joins
    const joinRes3 = await request(app)
      .post('/api/sessions/join')
      .send({
        sessionId,
        qrToken,
        peerDeviceId: 'student-member-3',
      });
    expect(joinRes3.status).toBe(200);
    expect(joinRes3.body.data.connectedDeviceIds).toContain('student-member-3');
    expect(joinRes3.body.data.memberCount).toBe(3);
  });

  test('1-to-1 Mode: Rejects second peer with 409 SESSION_FULL', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .send({
        hostDeviceId: 'direct-host-pc',
        mode: 'direct',
      });

    const { qrToken, sessionId } = createRes.body.data;

    // Peer 1 joins successfully
    const join1 = await request(app)
      .post('/api/sessions/join')
      .send({ sessionId, qrToken, peerDeviceId: 'first-peer' });
    expect(join1.status).toBe(200);

    // Peer 2 attempts to join -> 409
    const join2 = await request(app)
      .post('/api/sessions/join')
      .send({ sessionId, qrToken, peerDeviceId: 'second-peer' });
    expect(join2.status).toBe(409);
    expect(join2.body.error.code).toBe('SESSION_FULL');
  });

  test('Group Work: Permissions can be updated by host, but rejected for non-host', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .send({
        hostDeviceId: 'creator-device-1',
        mode: 'group',
        allowMemberUpload: false,
      });

    const { sessionId } = createRes.body.data;

    // Non-host tries to toggle permission -> 403
    const badPermRes = await request(app)
      .patch(`/api/sessions/${sessionId}/permissions`)
      .send({
        hostDeviceId: 'impostor-device',
        allowMemberUpload: true,
      });
    expect(badPermRes.status).toBe(403);

    // Host toggles permission to true -> 200
    const goodPermRes = await request(app)
      .patch(`/api/sessions/${sessionId}/permissions`)
      .send({
        hostDeviceId: 'creator-device-1',
        allowMemberUpload: true,
      });
    expect(goodPermRes.status).toBe(200);
    expect(goodPermRes.body.data.allowMemberUpload).toBe(true);

    // Check get session
    const sessionRes = await request(app).get(`/api/sessions/${sessionId}`);
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.data.allowMemberUpload).toBe(true);
  });

  test('Group Work: Enforces upload permission on members when allowMemberUpload is false', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .send({
        hostDeviceId: 'host-broadcast-only',
        mode: 'group',
        allowMemberUpload: false,
      });

    const { sessionId } = createRes.body.data;

    // Member tries to initiate transfer when allowMemberUpload is false -> 403
    const memberTransferRes = await request(app)
      .post('/api/transfers')
      .send({
        sessionId,
        fileName: 'assignment.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        senderDeviceId: 'member-unauthorized',
      });
    expect(memberTransferRes.status).toBe(403);

    // Host can initiate transfer anytime -> 201
    const hostTransferRes = await request(app)
      .post('/api/transfers')
      .send({
        sessionId,
        fileName: 'lecture_slides.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        senderDeviceId: 'host-broadcast-only',
      });
    expect(hostTransferRes.status).toBe(201);
    expect(hostTransferRes.body.data.transferId).toBeDefined();

    // Now host enables member uploads
    await request(app)
      .patch(`/api/sessions/${sessionId}/permissions`)
      .send({
        hostDeviceId: 'host-broadcast-only',
        allowMemberUpload: true,
      });

    // Member tries again -> now succeeds (201)
    const memberTransferRes2 = await request(app)
      .post('/api/transfers')
      .send({
        sessionId,
        fileName: 'assignment.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        senderDeviceId: 'member-unauthorized',
      });
    expect(memberTransferRes2.status).toBe(201);
  });
});
