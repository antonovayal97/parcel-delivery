import React from 'react';

const Stats: React.FC = () => {
  // Здесь будут реальные данные после подключения к API
  const stats = {
    users: 123,
    parcels: 456,
    requests: 78,
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: 24 }}>Статистика</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ flex: 1, background: '#f5f6fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.users}</div>
          <div>Пользователей</div>
        </div>
        <div style={{ flex: 1, background: '#f5f6fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.parcels}</div>
          <div>Посылок</div>
        </div>
        <div style={{ flex: 1, background: '#f5f6fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.requests}</div>
          <div>Заявок</div>
        </div>
      </div>
    </div>
  );
};

export default Stats; 