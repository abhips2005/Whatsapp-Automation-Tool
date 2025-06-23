import express from 'express';
import { extractVariables, validateTemplateContent } from '../../source/template-manager';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// File path for template storage
const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json');

// Ensure data directory exists
const dataDir = path.dirname(TEMPLATES_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load templates from file or initialize empty array
let templates: any[] = [];
try {
  if (fs.existsSync(TEMPLATES_FILE)) {
    const fileContent = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
    templates = JSON.parse(fileContent);
    console.log(`📄 Loaded ${templates.length} templates from storage`);
  } else {
    // Create initial templates
    templates = [
      {
        _id: uuidv4(),
        name: 'Welcome Message',
        content: 'Hello {{name}}, welcome to our program! Your role is {{role}}.',
        variables: ['name', 'role'],
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: 'Event Invitation',
        content: 'Hi {{name}}, you are invited to join {{event}} on {{date}}. Your branch {{branch}} is participating!',
        variables: ['name', 'event', 'date', 'branch'],
        createdAt: new Date().toISOString(),
      }
    ];
    saveTemplates();
    console.log('📄 Created initial templates');
  }
} catch (error) {
  console.error('Error loading templates:', error);
  templates = [];
}

// Save templates to file
function saveTemplates() {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error('Error saving templates:', error);
  }
}

router.get('/', (req, res) => {
  res.json(templates);
});

router.post('/', (req, res) => {
  const { name, content } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  if (!validateTemplateContent(content)) {
    return res.status(400).json({ error: 'Template content cannot be empty' });
  }

  const variables = extractVariables(content);
  const newTemplate = {
    _id: uuidv4(),
    name: name.trim(),
    content: content.trim(),
    variables,
    createdAt: new Date().toISOString(),
  };

  templates.push(newTemplate);
  saveTemplates();
  
  console.log(`📄 Created new template: "${newTemplate.name}" with variables: [${variables.join(', ')}]`);
  res.status(201).json(newTemplate);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, content } = req.body;
  const template = templates.find(t => t._id === id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  if (!validateTemplateContent(content)) {
    return res.status(400).json({ error: 'Template content cannot be empty' });
  }

  template.name = name.trim();
  template.content = content.trim();
  template.variables = extractVariables(content);
  template.updatedAt = new Date().toISOString();

  saveTemplates();
  console.log(`📄 Updated template: "${template.name}"`);
  res.json(template);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = templates.findIndex(t => t._id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const deleted = templates.splice(index, 1);
  saveTemplates();
  
  console.log(`📄 Deleted template: "${deleted[0].name}"`);
  res.json(deleted[0]);
});

export default router;