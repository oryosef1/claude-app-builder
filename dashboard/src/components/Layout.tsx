import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <div className="sidebar">
        <h2>Navigation</h2>
        <nav role="navigation">
          <ul>
            <li><Link to="/" className={isActive('/') ? 'active' : ''}>Dashboard</Link></li>
            <li><Link to="/workflow" className={isActive('/workflow') ? 'active' : ''}>Workflow</Link></li>
            <li><Link to="/todo" className={isActive('/todo') ? 'active' : ''}>Todo</Link></li>
            <li><Link to="/memory" className={isActive('/memory') ? 'active' : ''}>Memory</Link></li>
            <li><Link to="/logs" className={isActive('/logs') ? 'active' : ''}>Logs</Link></li>
          </ul>
        </nav>
      </div>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
