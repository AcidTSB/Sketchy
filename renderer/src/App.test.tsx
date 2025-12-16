// Temporary test App to debug white screen
function TestApp() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</h1>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>App is Running!</h2>
        <p style={{ opacity: 0.8 }}>If you see this, React is working correctly.</p>
        <p style={{ opacity: 0.6, marginTop: '1rem', fontSize: '0.875rem' }}>
          Check the browser console for any errors.
        </p>
      </div>
    </div>
  )
}

export default TestApp
