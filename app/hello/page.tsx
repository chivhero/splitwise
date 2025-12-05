export default function HelloPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>✅ Работает!</h1>
        <p style={{ fontSize: '24px', opacity: 0.9 }}>
          SplitWise загружается успешно
        </p>
        <p style={{ fontSize: '16px', marginTop: '40px', opacity: 0.7 }}>
          Тестовая страница без провайдеров
        </p>
      </div>
    </div>
  );
}




