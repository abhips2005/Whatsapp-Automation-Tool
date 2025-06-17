
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

export function MessageStatus({ messageId }: { messageId: string }) {
  const [status, setStatus] = useState('pending');

  useEffect(() => {
  
    socket.on('status_update', (data) => {
      if (data.messageId === messageId) setStatus(data.status);
    });


    fetch(`/api/message-status/${messageId}`)
      .then(res => res.json())
      .then(data => setStatus(data.status));

    return () => socket.off('status_update');
  }, [messageId]);

  return <span>Status: {status}</span>;
}