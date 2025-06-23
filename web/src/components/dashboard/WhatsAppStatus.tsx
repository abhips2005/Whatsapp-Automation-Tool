import React from 'react';
import { ApiService } from '../../services/api';

export const WhatsAppStatus: React.FC = () => {
  const [whatsappStatus, setWhatsappStatus] = React.useState<{ status: string; authenticated: boolean }>({ 
    status: 'disconnected', 
    authenticated: false 
  });
  const [qrData, setQrData] = React.useState<{ qrCode: string | null; status: string }>({ 
    qrCode: null, 
    status: 'disconnected' 
  });
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Check WhatsApp status periodically
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const [status, qr] = await Promise.all([
          ApiService.getWhatsAppStatus(),
          ApiService.getWhatsAppQR()
        ]);
        console.log('🔍 WhatsApp Status Check:', status);
        console.log('🔍 WhatsApp QR Check:', qr);
        setWhatsappStatus(status);
        setQrData(qr);
      } catch (error) {
        console.error('Failed to get WhatsApp status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const result = await ApiService.logoutWhatsApp();
      
      if (result.success) {
        // Reset status to disconnected
        setWhatsappStatus({ status: 'disconnected', authenticated: false });
        setQrData({ qrCode: null, status: 'disconnected' });
        
        // Show success message
        alert('✅ Logged out successfully! Generating new QR code for another WhatsApp account...');
        
        // Force refresh status after a short delay to get the new QR code
        setTimeout(() => {
          console.log('🔄 Refreshing status after logout...');
        }, 3000);
        
      } else {
        alert('❌ Failed to logout. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('❌ Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (whatsappStatus.status === 'authenticated' || whatsappStatus.status === 'ready' || whatsappStatus.authenticated) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700">WhatsApp Connected</h3>
              <p className="text-green-600 text-sm">Ready to send messages!</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-green-700 font-medium">🚀 Ready</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <span>🚪</span>
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if ((whatsappStatus.status === 'qr_ready' || qrData.status === 'qr_ready') && qrData.qrCode) {
    return (
      <div className="card">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">📱 Connect WhatsApp</h3>
          <p className="text-gray-600 mb-6">Scan this QR code with your WhatsApp to start sending messages</p>
          
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* QR Code */}
            <div className="flex-shrink-0">
              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.qrCode)}`}
                  alt="WhatsApp QR Code"
                  className="w-72 h-72"
                />
              </div>
              <div className="mt-4 flex items-center justify-center text-sm text-green-600">
                <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                QR code refreshes automatically
              </div>
            </div>

            {/* Instructions */}
            <div className="flex-1 text-left">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-4">How to Connect:</h4>
                <div className="space-y-3 text-blue-800">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-medium">1</span>
                    <p>Open <strong>WhatsApp</strong> on your phone</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-medium">2</span>
                    <p>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-medium">3</span>
                    <p>Tap <strong>"Link a Device"</strong></p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-medium">4</span>
                    <p>Scan this QR code with your camera</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {showInstructions ? 'Hide' : 'Show'} detailed instructions
                </button>
              </div>

              {showInstructions && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                  <p className="mb-2"><strong>Troubleshooting:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Make sure your phone is connected to the internet</li>
                    <li>If QR code doesn't work, try refreshing this page</li>
                    <li>You can only link 4 devices to one WhatsApp account</li>
                    <li>The QR code expires after 60 seconds and refreshes automatically</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-yellow-600 text-2xl">⏳</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting to WhatsApp...</h3>
        <p className="text-gray-600 mb-4">Please wait while we prepare your WhatsApp connection</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        
        <div className="mt-6 bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
          <p>If this takes more than 30 seconds, try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}; 