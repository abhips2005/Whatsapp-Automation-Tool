import express from 'express';
import { extractVariables, validateTemplateContent } from '../../source/template-manager';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const templates: any[] = [];

router.get('/', (req, res) => {
  res.json(templates);
});

router.post('/', (req, res) => {
  const { name, content } = req.body;

  if (!validateTemplateContent(content)) {
    return res.status(400).json({ error: 'Invalid template content' });
  }

  const variables = extractVariables(content);
  const newTemplate = {
    _id: uuidv4(),
    name,
    content,
    variables,
    createdAt: new Date().toISOString(),
  };

  templates.push(newTemplate);
  res.status(201).json(newTemplate);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, content } = req.body;
  const template = templates.find(t => t.id === id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if (!validateTemplateContent(content)) {
    return res.status(400).json({ error: 'Invalid template content' });
  }

  template.name = name;
  template.content = content;
  template.variables = extractVariables(content);
  template.updatedAt = new Date().toISOString();

  res.json(template);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = templates.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const deleted = templates.splice(index, 1);
  res.json(deleted[0]);
});

export default router;