'use client';

import { useEffect, useState } from 'react';

export default function MinimalPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ padding: '20px' }}>Загрузка...</div>;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #faf5ff, #fce7f3, #e0e7ff)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(to right, #9333ea, #7c3aed, #6366f1)',
        color: 'white',
        padding: '24px',
        borderRadius: '24px',
        marginBottom: '16px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          💰 Мои группы
        </h1>
      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Начать
        </h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          У вас пока нет групп. Создайте свою первую группу!
        </p>
        <button style={{
          background: 'linear-gradient(to right, #9333ea, #6366f1)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          border: 'none',
          fontSize: '16px',
          fontWeight: '500',
          cursor: 'pointer'
        }}>
          + Новая группа
        </button>
      </div>
    </div>
  );
}

