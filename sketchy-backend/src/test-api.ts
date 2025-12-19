// src/test-api.ts
const TEST_EMAIL = `test_${Date.now()}@sketchy.app` // Tạo email ngẫu nhiên để không bị trùng
const TEST_PASSWORD = 'MatKhauBiMat123'

async function runTest() {
  console.log('--- BẮT ĐẦU TEST API ---')

  // 1. THỬ ĐĂNG KÝ
  console.log(`\n1. Đang thử ĐĂNG KÝ với email: ${TEST_EMAIL}...`)
  const regRes = await fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Tester Pro',
    }),
  })
  const regData = await regRes.json()
  console.log('Kết quả Đăng ký:', regData)

  if (!regData.success) {
    console.error('❌ Đăng ký thất bại! Dừng test.')
    return
  }

  // 2. THỬ ĐĂNG NHẬP
  console.log(`\n2. Đang thử ĐĂNG NHẬP...`)
  const loginRes = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  })
  const loginData = await loginRes.json()

  if (loginData.success) {
    console.log('✅ ĐĂNG NHẬP THÀNH CÔNG!')
    console.log('Token nhận được:', loginData.token.substring(0, 20) + '...')
    console.log('User info:', loginData.user)
  } else {
    console.error('❌ Đăng nhập thất bại:', loginData)
  }
}

runTest()
