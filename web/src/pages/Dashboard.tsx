import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../services/websocket';
import { useAppActions, useContacts, useCampaigns } from '../store';
import { ApiService } from '../services/api';
import { CSVAnalysisResult } from '../types';

// Import modular components
import { WhatsAppStatus } from '../components/dashboard/WhatsAppStatus';
import { ContactsSummary } from '../components/dashboard/ContactsSummary';
import { CampaignsSummary } from '../components/dashboard/CampaignsSummary';
import { FieldMappingModal } from '../components/contacts/FieldMappingModal';
import { BroadcastModal } from '../components/broadcasting/BroadcastModal';

// --- Status & Analytics imports ---
import { CampaignAnalytics } from '../components/CampaignAnalytics';
// ----------------------------------

export const Dashboard: React.FC = () => {
  const { subscribe, isConnected } = useWebSocket();
  const { setContacts, setCampaigns, updateCampaign } = useAppActions();
  const contacts = useContacts();
  const campaigns = useCampaigns();

  // Modal states
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [csvAnalysis, setCsvAnalysis] = useState<CSVAnalysisResult | null>(null);

  // --- Analytics state ---
  const [analytics, setAnalytics] = useState({
    delivered: 0,
    read: 0,
    failed: 0,
    total: 0,
  });
  // -----------------------

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [contactsData, campaignsData] = await Promise.all([
          ApiService.getContacts(),
          ApiService.getAllCampaigns()
        ]);
        
        setContacts(contactsData.data);
        setCampaigns(campaignsData || []);
      } catch (error) {
        console.error('Failed to initialize data:', error);
      }
    };

    initializeData();
  }, [setContacts, setCampaigns]);

  // Subscribe to campaign updates
  useEffect(() => {
    if (isConnected()) {
      const unsubscribe = subscribe('campaign-update', (data: any) => {
        updateCampaign(data.campaignId, data.campaign);
      });

      return unsubscribe;
    }
  }, [isConnected, subscribe, updateCampaign]);

  // --- Subscribe to status updates ---
  useEffect(() => {
    if (isConnected()) {
      const unsubscribe = subscribe('status_update' as any, (data: any) => {
        // Example: update local status map if you want to show status in UI
        // setStatusMap(prev => ({ ...prev, [data.messageId]: data.status }));
      });
      return unsubscribe;
    }
  }, [isConnected, subscribe]);
  // -----------------------------------

  // --- Subscribe to campaign analytics updates ---
  useEffect(() => {
    if (isConnected()) {
      // Listen for real-time analytics updates
      const unsubscribe = subscribe('campaign_analytics' as any, (data: any) => {
        setAnalytics({
          delivered: data.delivered ?? 0,
          read: data.read ?? 0,
          failed: data.failed ?? 0,
          total: data.total ?? 0,
        });
      });

      // Optionally, fetch initial analytics from backend if available
      ApiService.getCampaignAnalytics?.('').then((data: any) => {
        if (data) {
          setAnalytics({
            delivered: data.delivered ?? 0,
            read: data.read ?? 0,
            failed: data.failed ?? 0,
            total: data.total ?? 0,
          });
        }
      }).catch(() => {});

      return unsubscribe;
    }
  }, [isConnected, subscribe]);
  // ------------------------------------------------

  // Quick Actions handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const analysis = await ApiService.analyzeCSV(file);
      setCsvAnalysis(analysis);
      setShowFieldMapping(true);
    } catch (error) {
      console.error('CSV analysis failed:', error);
      alert('Failed to analyze CSV file. Please check the file format.');
    }

    // Reset input
    event.target.value = '';
  };

  const handleFieldMappingSubmit = async (mapping: Record<string, string>) => {
    if (!csvAnalysis) return;

    try {
      const result = await ApiService.processCSV(csvAnalysis.tempFilePath, mapping);
      setContacts(result.data);
      setShowFieldMapping(false);
      setCsvAnalysis(null);
      alert(`Successfully processed ${result.stats.valid} contacts!`);
    } catch (error) {
      console.error('CSV processing failed:', error);
      alert('Failed to process CSV. Please check your field mapping.');
    }
  };

  const handleBroadcastSend = async (campaignData: { message: string; campaignName: string; filters?: any }) => {
    try {
      const result = await ApiService.startBroadcast(campaignData);
      setShowBroadcast(false);
      alert(`Campaign started! Broadcasting to ${result.targets} contacts.`);
      
      // Refresh campaigns
      const campaignsData = await ApiService.getAllCampaigns();
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Broadcast failed:', error);
      alert('Failed to start broadcast. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your broadcasting platform</p>
        </div>

        {/* WhatsApp Status */}
        <div className="mb-8">
          <WhatsAppStatus />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ContactsSummary contacts={contacts} />
          <CampaignsSummary campaigns={campaigns} />
        </div>

        {/* --- Analytics Component --- */}
        <div className="mb-8">
          <CampaignAnalytics stats={analytics} />
        </div>
        {/* -------------------------- */}

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Upload Contacts */}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-blue-600 text-xl">📁</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Upload CSV</span>
                <span className="text-xs text-gray-500 mt-1">Drag & drop or click</span>
              </label>
            </div>

            {/* Start Broadcast */}
            <button
              onClick={() => setShowBroadcast(true)}
              disabled={contacts.length === 0}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-green-600 text-xl">📤</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Send Broadcast</span>
              <span className="text-xs text-gray-500 mt-1">To {contacts.length} contacts</span>
            </button>

            {/* View Analytics */}
            <button
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-purple-600 text-xl">📈</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Analytics</span>
              <span className="text-xs text-gray-500 mt-1">Coming soon</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        {campaigns.length > 0 && (
          <div className="card mt-8">
            <h3 className="text-lg font-semibold mb-4">🔄 Recent Activity</h3>
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      campaign.status === 'completed' ? 'bg-green-500' :
                      campaign.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      campaign.status === 'failed' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{campaign.name}</p>
                      <p className="text-sm text-gray-500">
                        {campaign.progress?.sent || 0} / {campaign.progress?.total || 0} sent
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                       campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showFieldMapping && csvAnalysis && (
        <FieldMappingModal
          csvAnalysis={csvAnalysis}
          onClose={() => {
            setShowFieldMapping(false);
            setCsvAnalysis(null);
          }}
          onSubmit={handleFieldMappingSubmit}
        />
      )}

      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          onSend={handleBroadcastSend}
        />
      )}
    </div>
  );
};