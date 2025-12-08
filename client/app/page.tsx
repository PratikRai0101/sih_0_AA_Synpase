"use client"
import { useState } from 'react';
import Sidebar from './components/SideBar';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analytics';
import Training from './components/Traning';
import SmartContracts from './components/SmartContract';
import { AnalysisProvider } from './context/AnalysisContext';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'analysis':
        return <Analysis />;
      case 'training':
        return <Training />;
      case 'contracts':
        return <SmartContracts />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AnalysisProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="flex-1 overflow-y-auto">
          {renderPage()}
        </div>
      </div>
    </AnalysisProvider>
  );
}

export default App;
