import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { seedDefaultAdminAndSettings } from '../services/adminService.js';
import { config } from '../config/environment.js';

describe('UniDrop Admin & Transfer Engine Integration Tests', () => {
  let adminToken = '';
  let activeSessionId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
    await seedDefaultAdminAndSettings();

    // Create an active session for transfer tests
    const sessionRes = await request(app)
      .post('/api/sessions')
      .send({ hostDeviceId: 'test-lab-workstation-01', labComputerId: 'LAB-PC-99' });
    activeSessionId = sessionRes.body.data.sessionId;
  });

  afterAll(async () => {
    await new Promise(r => setTimeout(r, 150));
    await disconnectDatabase();
  });

  test('POST /api/admin/login succeeds with valid default credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        username: config.defaultAdmin.username,
        password: config.defaultAdmin.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.admin.username).toBe(config.defaultAdmin.username);
    adminToken = res.body.data.token;
  });

  test('POST /api/admin/login rejects wrong credentials with 401', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'IncorrectPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/admin/dashboard returns operational metrics with valid JWT', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.labComputers).toBeDefined();
    expect(res.body.data.sessions).toBeDefined();
    expect(res.body.data.transfers).toBeDefined();
  });

  test('GET /api/admin/dashboard rejects unauthorized request with 401', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  test('POST /api/transfers initializes P2P transfer metadata', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({
        sessionId: activeSessionId,
        fileName: 'assignment_report.pdf',
        fileSize: 1048576, // 1MB
        mimeType: 'application/pdf',
        senderDeviceId: 'student-mobile',
        transferMode: 'webrtc_p2p',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transferId).toBeDefined();
    expect(res.body.data.status).toBe('initialized');
  });

  test('POST /api/transfers rejects file exceeding max size limit', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({
        sessionId: activeSessionId,
        fileName: 'huge_archive.zip',
        fileSize: 500 * 1024 * 1024, // 500MB (limit is 100MB)
        mimeType: 'application/zip',
        senderDeviceId: 'student-mobile',
      });

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/transfers/relay/upload uploads and GET /api/transfers/:id/download downloads then deletes file', async () => {
    // Create a temporary sample file
    const sampleFilePath = path.join(config.tempUploadDir, 'test_sample.txt');
    fs.writeFileSync(sampleFilePath, 'Hello UniDrop Secure File Transfer Relay');

    const uploadRes = await request(app)
      .post('/api/transfers/relay/upload')
      .field('sessionId', activeSessionId)
      .field('senderDeviceId', 'student-mobile')
      .attach('file', sampleFilePath);

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    const transferId = uploadRes.body.data.transferId;

    // Download file
    const downloadRes = await request(app)
      .get(`/api/transfers/${transferId}/download`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe('Hello UniDrop Secure File Transfer Relay');

    // Clean up sample source file
    if (fs.existsSync(sampleFilePath)) {
      fs.unlinkSync(sampleFilePath);
    }
  });
});
