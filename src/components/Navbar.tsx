import React from 'react';

interface NavbarProps {
  activeTab: 'create' | 'my-requests' | 'all-requests' | 'profile' | 'api-test' | 'toast-test';
  onTabChange: (tab: 'create' | 'my-requests' | 'all-requests' | 'profile' | 'api-test' | 'toast-test') => void;
  onAllRequestsTab: () => void;
}

const navItems = [
  { key: 'create', icon: '📝', label: 'Создать\nзаявку' },
  { key: 'my-requests', icon: '📋', label: 'Мои\nзаявки' },
  { key: 'all-requests', icon: '📑', label: 'Все\nзаявки' },
  { key: 'profile', icon: '👤', label: 'Профиль' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onAllRequestsTab }) => {
  const handleTabClick = (tab: 'create' | 'my-requests' | 'all-requests' | 'profile' | 'api-test' | 'toast-test') => {
    if (tab === 'all-requests') {
      onAllRequestsTab();
    } else {
      onTabChange(tab);
    }
  };

  return (
    <nav className="navbar-bottom">
      {navItems.map((item) => (
        <div
          key={item.key}
          className={`nav-bottom-item${activeTab === item.key ? ' active' : ''}`}
          onClick={() => handleTabClick(item.key as any)}
        >
          <span className="nav-bottom-icon">{item.icon}</span>
          <span className="nav-bottom-label" style={{whiteSpace: 'pre-line'}}>{item.label}</span>
        </div>
      ))}
    </nav>
  );
}; 