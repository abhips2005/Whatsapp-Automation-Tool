import React, { useState } from 'react';

interface GoogleSyncConfig {
  apiKey: string;
  defaultSheetUrl: string;
  autoSync: boolean;
  syncInterval: number; // in minutes
  lastSync: string | null;
}

interface GoogleSyncSettingsProps {
  onSave?: (config: GoogleSyncConfig) => void;
  initialConfig?: Partial<GoogleSyncConfig>;
}

export const GoogleSyncSettings: React.FC<GoogleSyncSettingsProps> = ({
  onSave,
  initialConfig = {}
}) => {
  const [config, setConfig] = useState<GoogleSyncConfig>({
    apiKey: '',
    defaultSheetUrl: '',
    autoSync: false,
    syncInterval: 30,
    lastSync: null,
    ...initialConfig
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const validateGoogleSheetsUrl = (url: string): boolean => {
    const googleSheetsRegex = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    return googleSheetsRegex.test(url);
  };

  const handleInputChange = (field: keyof GoogleSyncConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear test results when config changes
    if (testResult) {
      setTestResult(null);
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a valid Google Sheets API Key'
      });
      return;
    }

    if (!config.defaultSheetUrl.trim() || !validateGoogleSheetsUrl(config.defaultSheetUrl)) {
      setTestResult({
        success: false,
        message: 'Please enter a valid Google Sheets URL'
      });
      return;
    }

    setIsTestingConnection(true);
    
    try {
      // Simulate API test - replace with actual API call later
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success/failure based on API key format
      const isValidApiKey = config.apiKey.length > 20 && config.apiKey.startsWith('AIza');
      
      if (isValidApiKey) {
        setTestResult({
          success: true,
          message: 'Connection successful! Google Sheets integration is working.'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Invalid API key format. Please check your Google Sheets API key.'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection failed. Please check your settings and try again.'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSave) {
        onSave(config);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const syncIntervalOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 180, label: '3 hours' },
    { value: 360, label: '6 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '24 hours' }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <span className="text-2xl mr-3">⚙️</span>
        <h2 className="text-xl font-semibold text-gray-900">Google Sheets Integration</h2>
      </div>

      <div className="space-y-6">
        {/* API Key Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Google Sheets API Key *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">🔑</span>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="AIzaSyC-..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="mt-2 flex items-start">
            <span className="text-blue-500 mt-0.5 mr-2">ℹ️</span>
            <p className="text-xs text-gray-600">
              Get your API key from{' '}
              <a 
                href="https://console.developers.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>
              . Enable Google Sheets API for your project.
            </p>
          </div>
        </div>

        {/* Default Sheet URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Google Sheet URL
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">📄</span>
            <input
              type="url"
              value={config.defaultSheetUrl}
              onChange={(e) => handleInputChange('defaultSheetUrl', e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                config.defaultSheetUrl && !validateGoogleSheetsUrl(config.defaultSheetUrl)
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-green-500'
              }`}
            />
          </div>
          {config.defaultSheetUrl && !validateGoogleSheetsUrl(config.defaultSheetUrl) && (
            <p className="mt-1 text-xs text-red-600">
              Please enter a valid Google Sheets URL
            </p>
          )}
        </div>

        {/* Auto Sync Settings */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Auto Sync</h3>
              <p className="text-xs text-gray-600">Automatically sync contacts from Google Sheets</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoSync}
                onChange={(e) => handleInputChange('autoSync', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                config.autoSync ? 'bg-green-600' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  config.autoSync ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`} />
              </div>
            </label>
          </div>

          {config.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Interval
              </label>
              <select
                value={config.syncInterval}
                onChange={(e) => handleInputChange('syncInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {syncIntervalOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Last Sync Info */}
        {config.lastSync && (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center">
              <span className="mr-2">🔄</span>
              <span className="text-sm text-gray-700">
                Last synced: {new Date(config.lastSync).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Test Connection */}
        <div className="border-t pt-6">
          <button
            onClick={handleTestConnection}
            disabled={isTestingConnection || !config.apiKey.trim() || !config.defaultSheetUrl.trim()}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md"
          >
            {isTestingConnection ? (
              <>
                <span className="mr-2 animate-spin">🔄</span>
                Testing Connection...
              </>
            ) : (
              <>
                <span className="mr-2">🧪</span>
                Test Connection
              </>
            )}
          </button>

          {testResult && (
            <div className={`mt-3 p-3 rounded-md flex items-start ${
              testResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <span className={`mt-0.5 mr-2 ${
                testResult.success ? 'text-green-500' : 'text-red-500'
              }`}>
                {testResult.success ? '✅' : '❌'}
              </span>
              <p className={`text-sm ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="border-t pt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md"
          >
            {isSaving ? (
              <>
                <span className="mr-2 animate-spin">🔄</span>
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <span className="mr-2">✅</span>
                Saved!
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};