
console.log('CampaignAnalytics component loaded');
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export function CampaignAnalytics() {
  const [stats, setStats] = useState({ delivered: 0, read: 0, failed: 0, total: 0 });

  // Helper to compute stats from status object
  function computeStats(statuses: Record<string, string>) {
    let delivered = 0, read = 0, failed = 0, total = 0;
    Object.values(statuses).forEach(status => {
      if (status === 'delivered') delivered++;
      else if (status === 'read' || status === 'played') read++;
      else if (status === 'failed') failed++;
      total++;
    });
    return { delivered, read, failed, total };
  }

  useEffect(() => {
    // Initial fetch
    fetch('/api/message-status/')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched statuses:', data.statuses);
        if (data.statuses) setStats(computeStats(data.statuses));
      });

    // Listen for real-time updates
    const handler = () => {
      fetch('/api/message-status/')
        .then(res => res.json())
        .then(data => {
          if (data.statuses) setStats(computeStats(data.statuses));
        });
    };
    socket.on('status_update', handler);
    return () => {
      socket.off('status_update', handler);
    };
  }, []);

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