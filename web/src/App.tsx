import React, { useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useWebSocket } from './services/websocket';
import { useAppActions, useContacts, useCampaigns } from './store';
import { ApiService } from './services/api';
import { 
  Contact, 
  Campaign, 
  CertificateRequest, 
  CertificateResponse,
  CSVAnalysisResult,
  DynamicFilterOption
} from './types';
import './index.css';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <AppContent />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// WhatsApp Status Component
function WhatsAppStatus() {
  const [whatsappStatus, setWhatsappStatus] = React.useState<{ status: string; authenticated: boolean }>({ status: 'disconnected', authenticated: false });
  const [qrData, setQrData] = React.useState<{ qrCode: string | null; status: string }>({ qrCode: null, status: 'disconnected' });
  const [showInstructions, setShowInstructions] = React.useState(false);

  // Check WhatsApp status periodically
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const [status, qr] = await Promise.all([
          ApiService.getWhatsAppStatus(),
          ApiService.getWhatsAppQR()
        ]);
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

  if (whatsappStatus.status === 'authenticated') {
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
          <div className="bg-green-50 px-4 py-2 rounded-lg">
            <span className="text-green-700 font-medium">🚀 Ready</span>
          </div>
        </div>
      </div>
    );
  }

  if (whatsappStatus.status === 'qr_ready' && qrData.qrCode) {
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
}

// App Content with all the logic
function AppContent() {
  const { connect, subscribe, isConnected } = useWebSocket();
  const { setContacts, setCampaigns, updateCampaign, setWebsocketConnected } = useAppActions();
  const contacts = useContacts();
  const campaigns = useCampaigns();

  const initializeApp = useCallback(async () => {
    try {
      // Check API health
      const health = await ApiService.healthCheck();
      console.log('✅ API Health:', health);

      // Load initial data
      const contactsData = await ApiService.getContacts();
      setContacts(contactsData.data);

      const campaignsData = await ApiService.getAllCampaigns();
      setCampaigns(campaignsData);

      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
    }
  }, [setContacts, setCampaigns]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // WebSocket connection - run only once
  useEffect(() => {
    let isSubscribed = true;
    
    const connectWebSocket = async () => {
      try {
        await connect();
        if (isSubscribed) {
          setWebsocketConnected(true);
          console.log('✅ WebSocket connected');
        }
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        if (isSubscribed) {
          setWebsocketConnected(false);
        }
      }
    };

    connectWebSocket();

    // Subscribe to campaign events
    const unsubscribeProgress = subscribe('campaign-progress', (data) => {
      console.log('📊 Campaign progress:', data);
      updateCampaign(data.campaignId, { progress: data.progress });
    });

    const unsubscribeCompleted = subscribe('campaign-completed', (campaign) => {
      console.log('✅ Campaign completed:', campaign.id);
      updateCampaign(campaign.id, campaign);
    });

    return () => {
      isSubscribed = false;
      unsubscribeProgress();
      unsubscribeCompleted();
    };
  }, []); // Empty dependency array - run only once

  return (
    <div className="container mx-auto px-4 py-8">
      <Header isConnected={isConnected()} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Contacts Summary */}
        <ContactsSummary contacts={contacts} />
        
        {/* Campaigns Summary */}
        <CampaignsSummary campaigns={campaigns} />
      </div>

      <div className="mt-8">
        <WhatsAppStatus />
      </div>

      <div className="mt-8">
        <QuickActions />
      </div>

      {/* Demo Instructions */}
      <div className="mt-12 card">
        <h2 className="text-xl font-bold mb-4">🎯 For Your Development Team</h2>
        <div className="prose max-w-none">
          <p>This is a working foundation with:</p>
          <ul>
            <li>✅ <strong>API Integration</strong> - All endpoints are connected</li>
            <li>✅ <strong>WebSocket</strong> - Real-time updates working</li>
            <li>✅ <strong>State Management</strong> - Zustand store configured</li>
            <li>✅ <strong>TypeScript</strong> - Full type safety</li>
            <li>✅ <strong>Styling</strong> - Tailwind CSS ready</li>
          </ul>
          <p className="mt-4">
            <strong>Next:</strong> Build the actual UI components! Check <code>DEVELOPMENT_GUIDE.md</code> for detailed instructions.
          </p>
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({ isConnected }: { isConnected: boolean }) {
  const [whatsappStatus, setWhatsappStatus] = React.useState<{ status: string; authenticated: boolean }>({ status: 'disconnected', authenticated: false });
  const [showQR, setShowQR] = React.useState(false);

  // Check WhatsApp status periodically
  React.useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const status = await ApiService.getWhatsAppStatus();
        setWhatsappStatus(status);
      } catch (error) {
        console.error('Failed to get WhatsApp status:', error);
      }
    };

    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getWhatsAppStatusColor = () => {
    switch (whatsappStatus.status) {
      case 'authenticated':
        return 'bg-green-50 text-green-700';
      case 'qr_ready':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-red-50 text-red-700';
    }
  };

  const getWhatsAppStatusText = () => {
    switch (whatsappStatus.status) {
      case 'authenticated':
        return '✅ WhatsApp Ready';
      case 'qr_ready':
        return '📱 Scan QR Code';
      default:
        return '❌ WhatsApp Disconnected';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Broadcaster Dashboard</h1>
        <p className="text-gray-600 mt-2">WhatsApp Campaign Management System</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* WebSocket Status */}
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isConnected 
            ? 'bg-success-50 text-success-700' 
            : 'bg-danger-50 text-danger-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-success-500' : 'bg-danger-500'
          }`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* WhatsApp Status */}
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm cursor-pointer ${getWhatsAppStatusColor()}`}
             onClick={() => whatsappStatus.status === 'qr_ready' && setShowQR(true)}>
          <div className={`w-2 h-2 rounded-full ${
            whatsappStatus.status === 'authenticated' ? 'bg-green-500' : 
            whatsappStatus.status === 'qr_ready' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span>{getWhatsAppStatusText()}</span>
        </div>

        {/* QR Code Modal */}
        {showQR && whatsappStatus.status === 'qr_ready' && (
          <WhatsAppQRModal onClose={() => setShowQR(false)} />
        )}
      </div>
    </div>
  );
}

// Contacts Summary Component
function ContactsSummary({ contacts }: { contacts: any[] }) {
  const roleCount = contacts.reduce((acc, contact) => {
    const role = contact.assignedRole || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">📊 Contacts Overview</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Contacts:</span>
          <span className="font-semibold">{contacts.length}</span>
        </div>
        
        {Object.entries(roleCount).map(([role, count]) => (
          <div key={role} className="flex justify-between">
            <span className="text-gray-600">{role}:</span>
            <span className="font-medium">{count as number}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Campaigns Summary Component
function CampaignsSummary({ campaigns }: { campaigns: any[] }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'running').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">🚀 Campaigns Overview</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Campaigns:</span>
          <span className="font-semibold">{campaigns.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Active:</span>
          <span className="font-medium text-primary-600">{activeCampaigns}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Completed:</span>
          <span className="font-medium text-success-600">{completedCampaigns}</span>
        </div>
      </div>
    </div>
  );
}

// Quick Actions Component
function QuickActions() {
  const [csvAnalysis, setCsvAnalysis] = React.useState<CSVAnalysisResult | null>(null);
  const [showFieldMapping, setShowFieldMapping] = React.useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = React.useState(false);
  const [showQRModal, setShowQRModal] = React.useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('📤 Analyzing file:', file.name);
      const result = await ApiService.analyzeCSV(file);
      console.log('✅ Analysis successful:', result);
      setCsvAnalysis(result);
      setShowFieldMapping(true);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      alert('File analysis failed. Check console for details.');
    }
  };

  const handleTestBroadcast = async () => {
    try {
      const result = await ApiService.startBroadcast({
        message: 'Hello {{name}}! This is a test message for {{role}} from {{branch}}.',
        campaignName: 'Test Campaign',
      });
      console.log('✅ Test broadcast started:', result);
      alert(`Test campaign started! Campaign ID: ${result.campaignId}`);
    } catch (error) {
      console.error('❌ Broadcast failed:', error);
      alert('Broadcast failed. Check console for details.');
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
      <div className="flex flex-wrap gap-4">
        <label className="btn-primary cursor-pointer">
          📤 Upload CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        
        <button
          onClick={() => setShowBroadcastModal(true)}
          className="btn-primary"
        >
          📱 Send WhatsApp Broadcast
        </button>
        
        <button
          onClick={() => setShowQRModal(true)}
          className="btn-secondary"
        >
          📲 WhatsApp QR Code
        </button>
        
        <button className="btn-secondary" disabled>
          📊 View Analytics (Coming Soon)
        </button>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> These are working examples! The backend API and WebSocket are fully functional.
          Your team can build the full UI around these working foundations.
        </p>
      </div>

      {/* Field Mapping Modal */}
      {showFieldMapping && csvAnalysis && (
        <FieldMappingModal 
          csvAnalysis={csvAnalysis}
          onClose={() => {
            setShowFieldMapping(false);
            setCsvAnalysis(null);
          }}
          onSubmit={async (fieldMapping) => {
            try {
              console.log('📤 Processing CSV with mapping:', fieldMapping);
              const result = await ApiService.processCSV(csvAnalysis.tempFilePath, fieldMapping);
              console.log('✅ Processing successful:', result);
              alert(`Successfully uploaded ${result.stats.valid} contacts!`);
              setShowFieldMapping(false);
              setCsvAnalysis(null);
            } catch (error) {
              console.error('❌ Processing failed:', error);
              alert('CSV processing failed. Check console for details.');
            }
          }}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <BroadcastModal 
          onClose={() => setShowBroadcastModal(false)}
          onSend={async (campaignData) => {
            try {
              const result = await ApiService.startBroadcast(campaignData);
              console.log('✅ Broadcast started:', result);
              alert(`Campaign started! Sending to ${result.targets} contacts. Campaign ID: ${result.campaignId}`);
              setShowBroadcastModal(false);
            } catch (error) {
              console.error('❌ Broadcast failed:', error);
              alert('Broadcast failed. Check console for details.');
            }
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <WhatsAppQRModal onClose={() => setShowQRModal(false)} />
      )}
    </div>
  );
}

// Field Mapping Modal Component
function FieldMappingModal({ 
  csvAnalysis, 
  onClose, 
  onSubmit 
}: { 
  csvAnalysis: CSVAnalysisResult; 
  onClose: () => void; 
  onSubmit: (mapping: Record<string, string>) => void;
}) {
  const [fieldMapping, setFieldMapping] = React.useState<Record<string, string>>({});
  
  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetField]: sourceColumn
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = Object.entries(csvAnalysis.expectedFields)
      .filter(([, config]) => config.required)
      .map(([field]) => field);
    
    const missingRequired = requiredFields.filter(field => !fieldMapping[field] || fieldMapping[field] === 'null');
    
    if (missingRequired.length > 0) {
      alert(`Please map these required fields: ${missingRequired.join(', ')}`);
      return;
    }

    onSubmit(fieldMapping);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Map CSV Fields</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Found <strong>{csvAnalysis.totalRows}</strong> rows with columns: 
          </p>
          <div className="flex flex-wrap gap-2">
            {csvAnalysis.availableColumns.map((col: string) => (
              <span key={col} className="px-2 py-1 bg-gray-100 rounded text-sm">
                {col}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Field Mapping</h3>
            <div className="space-y-4">
              {Object.entries(csvAnalysis.expectedFields).map(([field, config]) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1">
                    {field} {config.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={fieldMapping[field] || 'null'}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                    className="input-field"
                  >
                    <option value="null">-- Select Column --</option>
                    {csvAnalysis.availableColumns.map((col: string) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Sample Data Preview</h3>
            <div className="bg-gray-50 p-4 rounded text-xs">
              <pre>{JSON.stringify(csvAnalysis.sampleData[0] || {}, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Process CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// Broadcast Modal Component
function BroadcastModal({ 
  onClose, 
  onSend 
}: { 
  onClose: () => void; 
  onSend: (campaignData: { message: string; campaignName: string; filters?: any }) => void;
}) {
  const contacts = useContacts();
  const [campaignName, setCampaignName] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [sendToAll, setSendToAll] = React.useState(true);
  const [showPreview, setShowPreview] = React.useState(false);
  const [availableFilters, setAvailableFilters] = React.useState<DynamicFilterOption[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = React.useState(true);

  // Fetch available filter options on component mount
  React.useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setIsLoadingFilters(true);
        const response = await ApiService.getFilterOptions();
        if (response.success) {
          setAvailableFilters(response.filters);
        } else {
          console.warn('No filter options available:', response.message);
          setAvailableFilters([]);
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        setAvailableFilters([]);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    fetchFilterOptions();
  }, []);

  // Calculate filtered contacts based on current filters
  const filteredContacts = React.useMemo(() => {
    if (sendToAll) {
      return contacts;
    }

    // Check if any filters are applied
    const hasFilters = Object.values(filters).some(value => value && String(value).trim() !== '');
    if (!hasFilters) {
      return contacts;
    }

    // Apply filters
    return contacts.filter((contact: Contact) => {
      return Object.entries(filters).every(([fieldName, filterValue]) => {
        if (!filterValue || String(filterValue).trim() === '') {
          return true; // No filter applied for this field
        }

        const contactValue = contact[fieldName as keyof Contact];
        if (!contactValue) {
          return false; // Contact doesn't have this field
        }

        return String(contactValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });
  }, [contacts, filters, sendToAll]);

  // Preview message with first contact data
  const previewMessage = React.useMemo(() => {
    if (!message || filteredContacts.length === 0) return message;
    
    const firstContact = filteredContacts[0];
    return message
      .replace(/\{\{name\}\}/g, firstContact.name || 'Unknown')
      .replace(/\{\{role\}\}/g, firstContact.assignedRole || 'Unknown')
      .replace(/\{\{project\}\}/g, firstContact.project || 'Unknown')
      .replace(/\{\{branch\}\}/g, firstContact.branch || 'Unknown')
      .replace(/\{\{year\}\}/g, firstContact.year?.toString() || 'Unknown');
  }, [message, filteredContacts]);

  const handleSend = () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    if (filteredContacts.length === 0) {
      alert('No contacts match your filters');
      return;
    }

    // Convert filters to the format expected by the backend
    const campaignFilters = sendToAll ? {} : filters;
    
    onSend({
      message,
      campaignName,
      filters: campaignFilters
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">📱 Send WhatsApp Broadcast</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Composition */}
          <div>
            <h3 className="font-semibold mb-4">📝 Message</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Internship Announcement"
                className="input-field"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Message Content</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here...

You can use these placeholders:
{{name}} - Contact's name
{{email}} - Contact's email  
{{role}} - Contact's role
{{branch}} - Contact's branch
{{year}} - Contact's year"
                rows={10}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use placeholders like &#123;&#123;name&#125;&#125;, &#123;&#123;role&#125;&#125;, &#123;&#123;branch&#125;&#125;, &#123;&#123;year&#125;&#125; for personalization
              </p>
            </div>

            {/* Quick Templates */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Quick Templates</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMessage('Hello ' + '{{name}}' + '! Welcome to the ' + '{{branch}}' + ' internship program. Your role as ' + '{{role}}' + ' starts now!')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Welcome Message
                </button>
                <button
                  onClick={() => setMessage('Hi ' + '{{name}}' + ', this is a reminder about the upcoming meeting for ' + '{{role}}' + ' in ' + '{{branch}}' + ' department.')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Reminder
                </button>
                <button
                  onClick={() => setMessage('Dear ' + '{{name}}' + ', congratulations on completing your ' + '{{role}}' + ' internship in ' + '{{branch}}' + '!')}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  Completion
                </button>
              </div>
            </div>
          </div>

          {/* Filters & Preview */}
          <div>
            <h3 className="font-semibold mb-4">🎯 Target Audience</h3>
            
            {/* Send to All Option */}
            <div className="max-w-md">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">📢</span>
                  </div>
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setSendToAll(true)}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={sendToAll}
                        onChange={() => setSendToAll(true)}
                        className="mr-2"
                      />
                      <span className="font-medium text-blue-700">Send to Everyone ({contacts.length} contacts)</span>
                    </div>
                    <p className="text-sm text-blue-600 ml-6">Sending to all contacts: {contacts[0]?.name || 'Loading...'}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-500 mb-4">OR apply filters below to target specific groups</p>

            {isLoadingFilters ? (
              <div className="space-y-4 mb-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : availableFilters.length > 0 ? (
              <div className="space-y-4 mb-6">
                {availableFilters.map((filterOption) => (
                  <div key={filterOption.fieldName}>
                    <label className="block text-sm font-medium mb-1">
                      Filter by {filterOption.displayName}
                      <span className="text-gray-500 text-xs ml-1">({filterOption.count} options)</span>
                    </label>
                                         <select
                       value={filters[filterOption.fieldName] || ''}
                       onChange={(e) => {
                         setFilters((prev: Record<string, string>) => ({ 
                           ...prev, 
                           [filterOption.fieldName]: e.target.value 
                         }));
                         setSendToAll(false);
                       }}
                       className="input-field"
                     >
                      <option value="">All {filterOption.displayName}s</option>
                      {filterOption.values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                
                {/* Clear Filters Button */}
                {!sendToAll && Object.values(filters).some(v => v && String(v).trim() !== '') && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({});
                        setSendToAll(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ No filterable columns found in your data. 
                  All messages will be sent to everyone.
                </p>
              </div>
            )}

            {/* Target Count */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                <strong>📊 Target Audience:</strong> {filteredContacts.length} contacts
                {sendToAll && (
                  <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">All Contacts</span>
                )}
              </p>
              {filteredContacts.length > 0 && (
                                 <p className="text-xs text-blue-600 mt-1">
                   {sendToAll 
                     ? `Sending to all contacts: ${filteredContacts.slice(0, 3).map((c: Contact) => c.name).join(', ')}${filteredContacts.length > 3 ? ` and ${filteredContacts.length - 3} more` : ''}`
                     : `Filtered contacts: ${filteredContacts.slice(0, 3).map((c: Contact) => c.name).join(', ')}${filteredContacts.length > 3 ? ` and ${filteredContacts.length - 3} more` : ''}`
                   }
                 </p>
              )}
              {filteredContacts.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  No contacts match your current filters. Try clearing filters or adjusting your criteria.
                </p>
              )}
            </div>

            {/* Message Preview */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-medium">📱 Message Preview</h4>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>
              
              {showPreview && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="text-xs text-gray-500 mb-2">Preview with first contact:</div>
                  <div className="text-sm whitespace-pre-wrap">{previewMessage || 'Enter a message to see preview...'}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setFilters({ role: '', branch: '', year: '' })}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
          
          <div className="flex gap-4">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={handleSend} 
              className="btn-primary"
              disabled={!message.trim() || filteredContacts.length === 0}
            >
              📱 Send to {filteredContacts.length} contacts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// WhatsApp QR Code Modal Component
function WhatsAppQRModal({ onClose }: { onClose: () => void }) {
  const [qrData, setQrData] = React.useState<{ qrCode: string | null; status: string }>({ qrCode: null, status: 'disconnected' });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchQR = async () => {
      try {
        const data = await ApiService.getWhatsAppQR();
        setQrData(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to get QR code:', error);
        setLoading(false);
      }
    };

    fetchQR();
    const interval = setInterval(fetchQR, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-close when authenticated
  React.useEffect(() => {
    if (qrData.status === 'authenticated') {
      setTimeout(onClose, 2000); // Close after 2 seconds when authenticated
    }
  }, [qrData.status, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">📱 WhatsApp Authentication</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="text-center">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Loading QR Code...</p>
            </div>
          ) : qrData.status === 'authenticated' ? (
            <div className="space-y-4">
              <div className="text-green-600 text-4xl">✅</div>
              <h3 className="text-lg font-semibold text-green-700">WhatsApp Connected!</h3>
              <p className="text-gray-600">You can now send messages. This window will close automatically.</p>
            </div>
          ) : qrData.qrCode ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData.qrCode)}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Scan with WhatsApp</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Go to Settings → Linked Devices</p>
                  <p>3. Tap "Link a Device"</p>
                  <p>4. Scan this QR code</p>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                <strong>Note:</strong> This QR code refreshes automatically. Keep this window open while scanning.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-red-600 text-4xl">❌</div>
              <h3 className="text-lg font-semibold text-red-700">QR Code Not Available</h3>
              <p className="text-gray-600">Please make sure the WhatsApp service is running.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="btn-primary"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
