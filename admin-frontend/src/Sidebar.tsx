import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside style={{
      width: 220,
      background: '#222',
      color: '#fff',
      height: '100vh',
      padding: '32px 0',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 10,
      borderRight: '1px solid #333',
    }}>
      <div style={{ fontWeight: 700, fontSize: 22, textAlign: 'center', marginBottom: 40 }}>
        Admin Panel
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <a href="/admin/" style={{ color: '#fff', textDecoration: 'none', fontSize: 18, padding: '8px 32px', borderRadius: 6, transition: 'background 0.2s', background: 'rgba(255,255,255,0.05)' }}>Статистика</a>
        {/* Здесь можно добавить другие пункты меню */}
      </nav>
    </aside>
  );
};

export default Sidebar; 