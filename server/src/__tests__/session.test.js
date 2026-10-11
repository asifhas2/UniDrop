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
});
