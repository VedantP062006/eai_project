import React, { useState } from 'react';
import { VehicleProvider } from './context/VehicleContext';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { VisionPage } from './pages/VisionPage';
import { ControlsPage } from './pages/ControlsPage';
import { HistoryPage } from './pages/HistoryPage';
import { GesturesConfigPage } from './pages/GesturesConfigPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'vision':
        return <VisionPage />;
      case 'controls':
        return <ControlsPage />;
      case 'history':
        return <HistoryPage />;
      case 'gestures':
        return <GesturesConfigPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <VehicleProvider>
      <div className="app-container">
        <Navbar activePage={activePage} setActivePage={setActivePage} />
        <main className="main-content">
          {renderPage()}
        </main>
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '16px 24px',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            background: 'rgba(6, 9, 17, 0.85)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            maxWidth: 1600,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div>
            AURA VEHICLE AI © 2026 • AI GESTURE-CONTROLLED SMART VEHICLE SYSTEM
          </div>
          <div>
            POWERED BY MEDIAPIPE HANDS, OPENCV, FASTAPI & REACT
          </div>
        </footer>
      </div>
    </VehicleProvider>
  );
}

export default App;
