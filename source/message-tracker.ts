import { client } from './client';
import { io } from '../api/server';

const messageStatusDb: Record<string, string> = {};

client.on('message_ack', (msg, ack) => {
  // Concise debug log for ack events
  console.log('[DEBUG] message_ack event:', {
    messageId: msg.id?._serialized,
    ack,
    from: msg.from,
    to: msg.to,
    type: msg.type,
    body: msg.body,
    viewed: msg.viewed,
    isFromMe: msg.fromMe,
    timestamp: msg.timestamp,
  });

  if (!msg.id || !msg.id._serialized) return;
  const id = msg.id._serialized;
  let status = 'sent';
  if (ack === 1) status = 'delivered';
  else if (ack === 2) status = 'read';
  else if (ack === 3) status = 'played';
  messageStatusDb[id] = status;
  if (typeof io.emit === 'function') {
    io.emit('status_update', { messageId: id, status });
  }
  console.log(`Message ${id} status: ${status}`);
});

client.on('message_create', (msg) => {
  if (!msg.id || !msg.id._serialized) return;
  const id = msg.id._serialized;
  if (!messageStatusDb[id]) {
    messageStatusDb[id] = 'sent';
    if (typeof io.emit === 'function') {
      io.emit('status_update', { messageId: id, status: 'sent' });
    }
  }
});

export { messageStatusDb };
