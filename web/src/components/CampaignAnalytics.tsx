
import React from 'react';

export function CampaignAnalytics({ stats }: { stats: any }) {
  return (
    <div>
      <h3>Campaign Analytics</h3>
      <div>Delivered: {stats.delivered}</div>
      <div>Read: {stats.read}</div>
      <div>Failed: {stats.failed}</div>
      <div>Total: {stats.total}</div>
    </div>
  );
}