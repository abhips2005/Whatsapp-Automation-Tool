
import { Router } from 'express';

const router = Router();

const messageStatusDb: Record<string, string> = {
  'msg1': 'delivered',
  'msg2': 'read',
  'msg3': 'failed'
};

router.get('/:messageId', (req, res) => {
  const status = messageStatusDb[req.params.messageId] || 'pending';
  res.json({ status });
});

export default router;