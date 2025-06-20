import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api';
import { Campaign } from '../../types';

interface BroadcastReviewProps {
  campaignId: string;
  onClose: () => void;
}

export const BroadcastReview: React.FC<BroadcastReviewProps> = ({ campaignId, onClose }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaignStatus = async () => {
      try {
        const response = await ApiService.getCampaignStatus(campaignId);
        setCampaign(response);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to fetch campaign status');
        setIsLoading(false);
      }
    };

    fetchCampaignStatus();
    const interval = setInterval(fetchCampaignStatus, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [campaignId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading campaign status...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <div className="text-red-600 mb-4">{error || 'Campaign not found'}</div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const progress = campaign.progress;
  const percentage = Math.round((progress.sent / progress.total) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              Campaign Review: {campaign.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-medium text-gray-700">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.sent}</div>
                <div className="text-sm text-blue-800">Messages Sent</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{progress.failed}</div>
                <div className="text-sm text-yellow-800">Failed</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{progress.total}</div>
                <div className="text-sm text-green-800">Total Targets</div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Campaign Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    campaign.status === 'completed' ? 'text-green-600' :
                    campaign.status === 'failed' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Started:</span>
                  <span className="text-gray-900">
                    {new Date(campaign.startedAt || campaign.createdAt).toLocaleString()}
                  </span>
                </div>
                {campaign.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="text-gray-900">
                      {new Date(campaign.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Log */}
            {progress.errors.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Error Log</h3>
                <div className="max-h-40 overflow-y-auto">
                  {progress.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {campaign.status === 'failed' && (
            <button
              onClick={() => ApiService.resumeCampaign(campaignId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Resume Campaign
            </button>
          )}
          {campaign.status === 'running' && (
            <button
              onClick={() => ApiService.cancelCampaign(campaignId)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Cancel Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 