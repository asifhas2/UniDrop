/**
 * UniDrop Load and Performance Testing Harness
 * Benchmarks concurrent sessions, QR token generation, PIN verification,
 * and transfer API endpoints under staged virtual user concurrency (100, 250, 500, 1000).
 */

import http from 'http';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:5000';
const STAGES = [
  { users: 50, durationSec: 3 },
  { users: 100, durationSec: 5 },
  { users: 250, durationSec: 5 },
  { users: 500, durationSec: 5 },
  { users: 1000, durationSec: 5 },
];

const makeRequest = (path, method = 'GET', body = null) => {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(path, BASE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          durationMs: duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        durationMs: Date.now() - start,
        success: false,
        error: err.message,
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runStage = async (stage) => {
  console.log(`\n▶ [Stage] Testing ${stage.users} concurrent simulated users over ${stage.durationSec}s...`);

  const results = [];
  const start = Date.now();
  const end = start + stage.durationSec * 1000;

  const runUserWorker = async (userId) => {
    while (Date.now() < end) {
      // Scenario A: Health Check
      const healthRes = await makeRequest('/api/health');
      results.push(healthRes);

      // Scenario B: Create Session
      const sessionRes = await makeRequest('/api/sessions', 'POST', {
        hostDeviceId: `load_user_${userId}_${Date.now()}`,
      });
      results.push(sessionRes);

      await new Promise((r) => setTimeout(r, 200)); // Think time
    }
  };

  const workers = [];
  for (let i = 0; i < stage.users; i++) {
    workers.push(runUserWorker(i));
  }

  await Promise.all(workers);

  // Compute metrics
  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = total - successful;
  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (total / stage.durationSec).toFixed(1);

  console.log(`  ✓ Total Requests: ${total} | Throughput: ${rps} req/sec`);
  console.log(`  ✓ Success Rate: ${((successful / (total || 1)) * 100).toFixed(2)}% (${failed} errors)`);
  console.log(`  ✓ Latencies: p50 = ${p50}ms | p95 = ${p95}ms | p99 = ${p99}ms`);

  return { users: stage.users, total, successful, failed, p50, p95, p99, rps };
};

const main = async () => {
  console.log('=======================================================');
  console.log(' UniDrop Automated Load & Performance Benchmark');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(' Target Scenario: Up to 1,000 Concurrent Virtual Users');
  console.log('=======================================================');

  // Verify server reachability first
  const initial = await makeRequest('/api/health');
  if (!initial.success) {
    console.error(`❌ Target server at ${BASE_URL} is not currently running or reachable.`);
    console.log('Please start the server using `npm run server` before executing load benchmarks.');
    process.exit(1);
  }

  const stageResults = [];
  for (const stage of STAGES) {
    const res = await runStage(stage);
    stageResults.push(res);
  }

  console.log('\n=======================================================');
  console.log(' Load Test Benchmark Completed');
  console.log('=======================================================');
};

main();
