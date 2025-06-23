import React from 'react';
import { ApiService } from '../../services/api';

interface HeaderProps {
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isConnected }) => {
  const [whatsappStatus, setWhatsappStatus] = React.useState<{ status: string; authenticated: boolean }>({ 
    status: 'disconnected', 
    authenticated: false 
  });

  const checkWhatsAppStatus = async () => {
    try {
      const status = await ApiService.getWhatsAppStatus();
      setWhatsappStatus(status);
    } catch (error) {
      console.error('Failed to get WhatsApp status:', error);
    }
  };

  React.useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getWhatsAppStatusColor = () => {
    if (whatsappStatus.authenticated) return 'bg-green-100 text-green-800';
    if (whatsappStatus.status === 'qr_ready') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getWhatsAppStatusText = () => {
    if (whatsappStatus.authenticated) return '✅ Connected';
    if (whatsappStatus.status === 'qr_ready') return '📱 Scan QR';
    return '❌ Disconnected';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Broadcaster</h1>
              <p className="text-sm text-gray-500">Communication Platform</p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            {/* WebSocket Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* WhatsApp Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getWhatsAppStatusColor()}`}>
              {getWhatsAppStatusText()}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}; 