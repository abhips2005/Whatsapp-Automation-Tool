import { Router } from 'express';

const router = Router();

// Helper: Substitute {{variable}} in template with contact data
function generatePreview(template: string, contact: Record<string, any>) {
  const missingVars: string[] = [];
  const preview = template.replace(/{{\s*(\w+)\s*}}/g, (match, varName) => {
    if (contact[varName] !== undefined && contact[varName] !== null) {
      return String(contact[varName]);
    } else {
      missingVars.push(varName);
      return `[${varName} missing]`;
    }
  });
  return { preview, missingVars };
}

// POST /api/preview
router.post('/', (req, res) => {
  const { template, contact } = req.body;
  if (typeof template !== 'string' || typeof contact !== 'object') {
    return res.status(400).json({ error: 'Invalid template or contact' });
  }
  const { preview, missingVars } = generatePreview(template, contact);
  res.json({ preview, missingVars });
});

export default router; 