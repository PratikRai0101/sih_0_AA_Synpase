"use client"
import { useState } from 'react';
import Sidebar from './components/SideBar';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analytics';
import Training from './components/Traning';
import SmartContracts from './components/SmartContract';
import { AnalysisProvider } from './context/AnalysisContext';
import { Menu, X } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden`}>
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Hamburger Menu Button */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-teal-700 p-2 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto">
            {renderPage()}
          </div>
        </div>
      </div>
    </AnalysisProvider>
  );
}

export default App;
