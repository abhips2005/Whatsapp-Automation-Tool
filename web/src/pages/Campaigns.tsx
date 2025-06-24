import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Campaign } from '../types';
import { useWebSocket } from '../services/websocket';

interface CampaignDetail {
  id: string;
  name: string;
  message: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    sent: number;
    failed: number;
    errors: string[];
  };
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  recipients?: Array<{
    name: string;
    phone: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    timestamp?: string;
    error?: string;
    messageId?: string;
  }>;
}

interface CampaignAnalytics {
  totalCampaigns: number;
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalMessagesRead: number;
  totalMessagesFailed: number;
  averageSuccessRate: number;
  campaignsByStatus: {
    completed: number;
    running: number;
    failed: number;
    queued: number;
  };
}

interface CampaignsProps {
  onBack?: () => void;
}

export const Campaigns: React.FC<CampaignsProps> = ({ onBack }) => {
  const { subscribe, isConnected } = useWebSocket();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadAnalytics();
  }, []);

  // Subscribe to real-time campaign updates
  useEffect(() => {
    if (isConnected()) {
      const unsubscribe = subscribe('campaign-update', (data: any) => {
        // Update the campaigns list
        setCampaigns(prev => prev.map(c => 
          c.id === data.campaignId ? data.campaign : c
        ));
        
        // Update selected campaign if it's the same one
        if (selectedCampaign && selectedCampaign.id === data.campaignId) {
          setSelectedCampaign(data.campaign);
        }
        
        // Refresh analytics
        loadAnalytics();
      });

      return unsubscribe;
    }
  }, [isConnected, subscribe, selectedCampaign]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAllCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load campaigns');
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      // Calculate analytics from campaigns data
      const campaignsData = await ApiService.getAllCampaigns();
      const campaigns = Array.isArray(campaignsData) ? campaignsData : [];
      
      const analytics: CampaignAnalytics = {
        totalCampaigns: campaigns.length,
        totalMessagesSent: campaigns.reduce((sum, c) => sum + (c.progress?.sent || 0), 0),
        totalMessagesDelivered: campaigns.reduce((sum, c) => {
          return sum + (c.recipients?.filter((r: any) => r.status === 'delivered' || r.status === 'read').length || 0);
        }, 0),
        totalMessagesRead: campaigns.reduce((sum, c) => {
          return sum + (c.recipients?.filter((r: any) => r.status === 'read').length || 0);
        }, 0),
        totalMessagesFailed: campaigns.reduce((sum, c) => sum + (c.progress?.failed || 0), 0),
        averageSuccessRate: campaigns.length > 0 ? 
          (campaigns.reduce((sum, c) => sum + (c.progress?.sent || 0), 0) / 
           campaigns.reduce((sum, c) => sum + (c.progress?.total || 1), 0)) * 100 : 0,
        campaignsByStatus: {
          completed: campaigns.filter(c => c.status === 'completed').length,
          running: campaigns.filter(c => c.status === 'running').length,
          failed: campaigns.filter(c => c.status === 'failed').length,
          queued: campaigns.filter(c => c.status === 'queued').length,
        }
      };
      
      setAnalytics(analytics);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const handleCampaignClick = async (campaign: Campaign) => {
    try {
      // Fetch detailed campaign data from the backend
      const campaignDetail = await ApiService.getCampaignStatus(campaign.id);
      
      // Create the detailed campaign object with real recipient data
      const detail: CampaignDetail = {
        ...campaignDetail,
        recipients: (campaignDetail as any).recipients || []
      };
      
      setSelectedCampaign(detail);
    } catch (err) {
      console.error('Error loading campaign details:', err);
      // Fallback to basic campaign data without recipients if API fails
      setSelectedCampaign({
        ...campaign,
        recipients: []
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'failed': return '❌';
      case 'queued': return '⏳';
      default: return '📱';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center text-blue-600 hover:text-blue-800 mr-4 transition-colors"
              >
                <span className="mr-2">←</span>
                Back to Dashboard
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Campaign Analytics</h1>
          <p className="mt-2 text-gray-600">Monitor and analyze your WhatsApp broadcast campaigns</p>
        </div>

        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Campaigns</h3>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">📤</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Messages Sent</h3>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalMessagesSent}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">👁️</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Messages Read</h3>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalMessagesRead}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-2xl">❌</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Failed</h3>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalMessagesFailed}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Status Overview */}
        {analytics && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.campaignsByStatus.completed}</div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.campaignsByStatus.running}</div>
                  <div className="text-sm text-gray-500">Running</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{analytics.campaignsByStatus.queued}</div>
                  <div className="text-sm text-gray-500">Queued</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{analytics.campaignsByStatus.failed}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Campaigns</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📭</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-500">Start your first broadcast campaign to see analytics here.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      onClick={() => handleCampaignClick(campaign)}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{getStatusIcon(campaign.status)}</div>
                          <div>
                            <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Created {new Date(campaign.createdAt).toLocaleDateString()} at{' '}
                              {new Date(campaign.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 truncate max-w-md">
                              {campaign.message.length > 100 
                                ? `${campaign.message.substring(0, 100)}...` 
                                : campaign.message}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                          <div className="mt-2 text-sm text-gray-500">
                            <div>{campaign.progress?.sent || 0} / {campaign.progress?.total || 0} sent</div>
                            {campaign.progress?.failed > 0 && (
                              <div className="text-red-600">{campaign.progress.failed} failed</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              campaign.status === 'completed' ? 'bg-green-500' :
                              campaign.status === 'running' ? 'bg-blue-500' :
                              campaign.status === 'failed' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}
                            style={{
                              width: `${campaign.progress?.total > 0 
                                ? (campaign.progress.sent / campaign.progress.total) * 100 
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Details Modal */}
        {selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Campaign Details</h2>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Campaign Info */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{selectedCampaign.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(selectedCampaign.status)}`}>
                            {selectedCampaign.status}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p className="text-gray-900">
                          {new Date(selectedCampaign.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {selectedCampaign.completedAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Completed</label>
                          <p className="text-gray-900">
                            {new Date(selectedCampaign.completedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Message Content</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedCampaign.message}</p>
                    </div>
                  </div>
                </div>

                {/* Recipients List */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recipients ({selectedCampaign.recipients?.length || 0})</h3>
                  
                  {/* Status Legend */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Message Status Legend:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <span>⏳</span>
                        <span className="text-gray-600">Pending</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>📤</span>
                        <span className="text-gray-600">Sent</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>✅</span>
                        <span className="text-gray-600">Delivered</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>👀</span>
                        <span className="text-gray-600">Read</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>❌</span>
                        <span className="text-gray-600">Failed</span>
                      </div>
                    </div>
                  </div>
                  
                                     {/* Filter tabs */}
                   <div className="flex space-x-1 mb-4">
                     {['all', 'pending', 'sent', 'delivered', 'read', 'failed'].map((filter) => (
                       <button
                         key={filter}
                         className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                       >
                         {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                         {filter === 'all' ? 
                           ` (${selectedCampaign.recipients?.length || 0})` :
                           ` (${selectedCampaign.recipients?.filter(r => r.status === filter).length || 0})`
                         }
                       </button>
                     ))}
                   </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {selectedCampaign.recipients?.map((recipient, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                recipient.status === 'read' ? 'bg-blue-500' :
                                recipient.status === 'delivered' ? 'bg-green-500' :
                                recipient.status === 'sent' ? 'bg-yellow-500' :
                                recipient.status === 'pending' ? 'bg-gray-400' :
                                recipient.status === 'failed' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`} />
                              <span className="text-lg">
                                {recipient.status === 'read' ? '👀' :
                                 recipient.status === 'delivered' ? '✅' :
                                 recipient.status === 'sent' ? '📤' :
                                 recipient.status === 'pending' ? '⏳' :
                                 recipient.status === 'failed' ? '❌' :
                                 '❓'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{recipient.name}</p>
                              <p className="text-sm text-gray-500">{recipient.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                                                         <span className={`px-2 py-1 rounded text-xs font-medium ${
                               recipient.status === 'read' ? 'bg-blue-100 text-blue-800' :
                               recipient.status === 'delivered' ? 'bg-green-100 text-green-800' :
                               recipient.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                               recipient.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                               recipient.status === 'failed' ? 'bg-red-100 text-red-800' :
                               'bg-gray-100 text-gray-800'
                             }`}>
                              {recipient.status}
                            </span>
                            {recipient.timestamp && (
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(recipient.timestamp).toLocaleTimeString()}
                              </p>
                            )}
                            {recipient.error && (
                              <p className="text-xs text-red-600 mt-1">{recipient.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 