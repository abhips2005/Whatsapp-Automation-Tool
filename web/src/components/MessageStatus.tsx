import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export function MessageStatus({ messageId }: { messageId: string }) {
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const handler = (data: any) => {
      if (data.messageId === messageId) setStatus(data.status);
    };
    socket.on('status_update', handler);

    fetch(`/api/message-status/${messageId}`)
      .then(res => res.json())
      .then(data => setStatus(data.status));

    return () => {
      socket.off('status_update', handler);
    };
  }, [messageId]);

  return <span>Status: {status}</span>;
}