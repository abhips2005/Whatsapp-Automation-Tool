import React from 'react';

interface CampaignsSummaryProps {
  campaigns: any[];
}

export const CampaignsSummary: React.FC<CampaignsSummaryProps> = ({ campaigns }) => {
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'running').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">📊 Campaigns Overview</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalCampaigns}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activeCampaigns}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{completedCampaigns}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
        </div>
        
        {campaigns.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Recent Campaigns:</h4>
            <div className="space-y-2">
              {campaigns
                .slice(0, 3)
                .map((campaign) => (
                  <div key={campaign.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate">{campaign.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        <div className="pt-3 border-t">
          <button className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Campaigns →
          </button>
        </div>
      </div>
    </div>
  );
}; 