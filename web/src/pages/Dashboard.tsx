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
import { GoogleSyncSettings } from '../components/dashboard/googleSyncSettings'; // Add this import

export const Dashboard: React.FC = () => {
  const { subscribe, isConnected } = useWebSocket();
  const { setContacts, setCampaigns, updateCampaign } = useAppActions();
  const contacts = useContacts();
  const campaigns = useCampaigns();

  // Modal states
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false); // Add this
  const [showGoogleSyncSettings, setShowGoogleSyncSettings] = useState(false); // Add this
  const [csvAnalysis, setCsvAnalysis] = useState<CSVAnalysisResult | null>(null);
  const [showAutoSync, setShowAutoSync] = useState(false); // Auto-sync toggle state
  const [autoSyncConfig, setAutoSyncConfig] = useState({
    apiKey: '',
    syncInterval: 30,
    autoMessage: false,
    welcomeMessage: 'Welcome! You\'ve been added to our updates.'
  });
  const [isImporting, setIsImporting] = useState(false); // Importing state

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

  // Add Google Sheets handler
  const handleGoogleSheetsImport = async (url: string, useApiKey: boolean = false) => {
    try {
      setIsImporting(true);
      
      const requestBody: any = { sheetUrl: url };
      
      // Include API key if auto-sync is enabled
      if (useApiKey && autoSyncConfig.apiKey) {
        requestBody.apiKey = autoSyncConfig.apiKey;
      }
      
      console.log('🚀 Importing from Google Sheets...');
      
      // Call Google Sheets import endpoint
      const response = await fetch('/api/google-sheets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Google Sheets converted to CSV, showing field mapping...');
        
        // The result has the same format as CSV analysis
        // So we can directly use it with existing field mapping UI
        setCsvAnalysis({
          ...result,
          source: 'google_sheets' // Mark as Google Sheets source
        });
        
        setShowFieldMapping(true);
        setShowGoogleSheetsModal(false);
        
      } else {
        console.error('❌ Import failed:', result.error);
        alert(`Import failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Import error:', error);
      alert('Failed to import from Google Sheets. Please check your connection and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // NEW: Handle Auto-Sync Setup
  const handleAutoSyncSetup = async (url: string) => {
    if (!autoSyncConfig.apiKey.trim()) {
      alert('API Key is required for Auto-Sync');
      return;
    }

    try {
      setIsImporting(true);

      // TODO: Save auto-sync configuration to backend
      console.log('Setting up auto-sync with config:', {
        sheetUrl: url,
        ...autoSyncConfig
      });

      // For now, just do a one-time import
      await handleGoogleSheetsImport(url);
      
      alert('🎉 Auto-sync configured! (Full auto-sync will be implemented in backend)');
      
    } catch (error) {
      console.error('Auto-sync setup failed:', error);
      alert('Failed to setup auto-sync. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Update the handleTestConnection function
  const handleTestConnection = async () => {
    if (!autoSyncConfig.apiKey.trim()) {
      alert('Please enter your Google Sheets API Key');
      return;
    }

    try {
      const input = document.querySelector('input[type="url"]') as HTMLInputElement;
      const url = input?.value;
      
      if (!url?.trim()) {
        alert('Please enter a Google Sheets URL');
        return;
      }

      console.log('🧪 Testing connection...');

      const response = await fetch('/api/google-sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: url,
          apiKey: autoSyncConfig.apiKey
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Connection successful! Your API key and sheet URL are working correctly.');
      } else {
        alert('❌ Connection failed: ' + result.error);
      }
      
    } catch (error) {
      console.error('❌ Test connection error:', error);
      alert('❌ Connection test failed. Please check your network connection.');
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

        {/* Quick Actions - Keep 4 columns */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> {/* Keep 4 columns */}
            {/* Upload CSV */}
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

            {/* Google Sheets */}
            <button
              onClick={() => setShowGoogleSheetsModal(true)}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-green-600 text-xl">📊</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Google Sheets</span>
              <span className="text-xs text-gray-500 mt-1">Paste sheets link</span>
            </button>

            {/* Send Broadcast */}
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

            {/* RESTORED: Analytics */}
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

      {/* Updated Google Sheets Modal */}
      {showGoogleSheetsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">📊</span>
                Import from Google Sheets
              </h3>
              <button
                onClick={() => {
                  setShowGoogleSheetsModal(false);
                  setShowAutoSync(false); // Reset toggle when closing
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Google Sheets URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Sheets URL
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const url = (e.target as HTMLInputElement).value;
                      if (url.trim()) {
                        handleGoogleSheetsImport(url);
                      }
                    }
                  }}
                />
              </div>

              {/* Auto-Sync Toggle */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Auto-Sync</h4>
                    <p className="text-xs text-gray-600">Automatically sync changes from this sheet</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAutoSync}
                      onChange={(e) => setShowAutoSync(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      showAutoSync ? 'bg-green-600' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        showAutoSync ? 'translate-x-5' : 'translate-x-0'
                      } mt-0.5 ml-0.5`} />
                    </div>
                  </label>
                </div>

                {/* Auto-Sync Configuration (Only shows when toggle is ON) */}
                {showAutoSync && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-4">
                    <h5 className="text-sm font-semibold text-blue-900 flex items-center">
                      <span className="mr-2">⚙️</span>
                      Auto-Sync Configuration
                    </h5>

                    {/* Google Sheets API Key */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Google Sheets API Key (Required for Auto-Sync)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-blue-400">🔑</span>
                        <input
                          type="password"
                          placeholder="AIzaSyC-..."
                          value={autoSyncConfig.apiKey}
                          onChange={(e) => setAutoSyncConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Get from{' '}
                        <a 
                          href="https://console.developers.google.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-800"
                        >
                          Google Cloud Console
                        </a>
                      </p>
                    </div>

                    {/* Sync Interval */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Check for Changes Every
                      </label>
                      <select
                        value={autoSyncConfig.syncInterval}
                        onChange={(e) => setAutoSyncConfig(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={180}>3 hours</option>
                        <option value={360}>6 hours</option>
                        <option value={720}>12 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>

                    {/* Auto-Message New Contacts */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-800">
                          Send message to new contacts
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoSyncConfig.autoMessage}
                            onChange={(e) => setAutoSyncConfig(prev => ({ ...prev, autoMessage: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className={`w-8 h-5 rounded-full transition-colors ${
                            autoSyncConfig.autoMessage ? 'bg-blue-600' : 'bg-gray-300'
                          }`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                              autoSyncConfig.autoMessage ? 'translate-x-3' : 'translate-x-0'
                            } mt-0.5 ml-0.5`} />
                          </div>
                        </label>
                      </div>

                      {autoSyncConfig.autoMessage && (
                        <textarea
                          placeholder="Welcome message for new contacts..."
                          value={autoSyncConfig.welcomeMessage}
                          onChange={(e) => setAutoSyncConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Test Connection Button */}
                    <button
                      onClick={handleTestConnection}
                      disabled={!autoSyncConfig.apiKey}
                      className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md"
                    >
                      <span className="mr-1">🧪</span>
                      Test API Connection
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  📋 How to share your Google Sheet:
                </h4>
                <ol className="text-xs text-gray-700 space-y-1">
                  <li>1. Open your Google Sheet</li>
                  <li>2. Click "Share" button (top right)</li>
                  <li>3. Set "Anyone with the link" can view</li>
                  <li>4. Copy and paste the link above</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowGoogleSheetsModal(false);
                    setShowAutoSync(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                    const url = input?.value;
                    if (url?.trim()) {
                      if (showAutoSync) {
                        handleAutoSyncSetup(url);
                      } else {
                        handleGoogleSheetsImport(url);
                      }
                    }
                  }}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md"
                >
                  {isImporting ? 'Processing...' : showAutoSync ? 'Setup Auto-Sync' : 'Import Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Google Sync Settings Modal */}
      {showGoogleSyncSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Google Sheets Settings</h3>
              <button
                onClick={() => setShowGoogleSyncSettings(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <GoogleSyncSettings
                onSave={(config) => {
                  console.log('Saving Google Sync config:', config);
                  // Handle save logic here
                  setShowGoogleSyncSettings(false);
                  alert('Settings saved! (Backend integration coming soon)');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};