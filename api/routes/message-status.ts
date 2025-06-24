
import { Router } from 'express';
import { messageStatusDb } from '../../source/message-tracker';

const router = Router();

// Get status for a single message
router.get('/:messageId', (req, res) => {
  const status = messageStatusDb[req.params.messageId] || 'pending';
  res.json({ status });
});

// (Optional) Get all statuses
router.get('/', (req, res) => {
  res.json({ statuses: messageStatusDb });
});

export default router;