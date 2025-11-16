'use client';

export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>✅ Тестовая страница работает!</h1>
      <p>Если ты видишь это сообщение - Next.js работает корректно.</p>
      <p>Время: {new Date().toLocaleString()}</p>
    </div>
  );
}

