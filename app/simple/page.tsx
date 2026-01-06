'use client';

import { useEffect, useState } from 'react';

export default function SimplePage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await fetch('/api/groups?telegramId=123456789');
        const data = await response.json();
        setGroups(data.groups || []);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Мои группы</h1>
      <p>Групп: {groups.length}</p>
      {groups.length === 0 && <p>Нет групп. Создайте первую группу!</p>}
      <pre>{JSON.stringify(groups, null, 2)}</pre>
    </div>
  );
}

