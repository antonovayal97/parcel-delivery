import { useState } from 'react';
import Sidebar from './Sidebar';
import Stats from './Stats';
import Login from './Login';

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('admin_token'));

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuth(false);
  };

  if (!isAuth) {
    return <Login onLogin={() => setIsAuth(true)} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, width: '100%', maxWidth: 1200, padding: '40px 48px', boxSizing: 'border-box', marginRight: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0', color: '#222' }}>Статистика</h1>
          <button onClick={handleLogout} style={{ padding: '8px 20px', borderRadius: 6, background: '#e74c3c', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer' }}>Выйти</button>
        </div>
        <Stats />
      </main>
    </div>
  );
}

export default App;
