require('../server.js');

setTimeout(async () => {
  try {
    // 1. Health Check
    const healthRes = await fetch('http://127.0.0.1:5000/api/health');
    console.log('\n--- 1. HEALTH CHECK ---');
    console.log(await healthRes.json());

    // 2. Register Student
    const regRes = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aarav Sharma',
        email: 'aarav@university.edu',
        password: 'Password123',
        studentId: '221IT017',
      }),
    });
    const regData = await regRes.json();
    console.log('\n--- 2. STUDENT REGISTER ---');
    console.log(regData);

    // 3. Login Student
    const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aarav@university.edu',
        password: 'Password123',
        expectedRole: 'student',
      }),
    });
    const loginData = await loginRes.json();
    console.log('\n--- 3. STUDENT LOGIN ---');
    console.log(loginData);

    // 4. Get /api/auth/me with Bearer token
    const meRes = await fetch('http://127.0.0.1:5000/api/auth/me', {
      headers: { Authorization: 'Bearer ' + loginData.token },
    });
    console.log('\n--- 4. GET /api/auth/me ---');
    console.log(await meRes.json());

    // 5. Login Admin
    const adminRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@university.edu',
        password: 'Admin@123',
        expectedRole: 'admin',
      }),
    });
    console.log('\n--- 5. ADMIN LOGIN ---');
    console.log(await adminRes.json());

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}, 2000);
