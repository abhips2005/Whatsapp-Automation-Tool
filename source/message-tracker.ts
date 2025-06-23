
import EventEmitter from 'events';

export const whatsappClient = new EventEmitter();

const messageStatusDb: Record<string, string> = {};

whatsappClient.on('delivered', (msg) => {
  messageStatusDb[msg.id] = 'delivered';
  console.log(`Message ${msg.id} delivered`);
});

whatsappClient.on('read', (msg) => {
  messageStatusDb[msg.id] = 'read';
  console.log(`Message ${msg.id} read`);
});

whatsappClient.on('failed', (msg) => {
  messageStatusDb[msg.id] = 'failed';
  console.log(`Message ${msg.id} failed`);
});

export { messageStatusDb };