import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import TemplateEditor from './TemplateEditor';

interface MessageTemplate {
  _id: string;
  name: string;
  content: string;
  createdAt: string;
}

const TemplateLibrary = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  const fetchTemplates = async () => {
    console.log("Fetching templates from ApiService.getMessageTemplates()...");
    try {
      const response = await ApiService.getMessageTemplates();
      console.log("Response received:", response);

    if (!Array.isArray(response)) {
      console.warn("❗ Response is not an array:", response);
    } else {
      console.log("📦 Templates array:", response);
    }

      setTemplates(response);
    } catch (err) {
      setError('Failed to load templates');
      console.error("❌ Error fetching templates:",err);
    } finally {
      setLoading(false);
      console.log("✅ Finished loading templates");
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    fetchTemplates(); // refresh list
  };

  const handleCancel = () => {
    setShowEditor(false);
  };
 
  console.log(`📋 Templates in state: (${templates.length} total)`, templates);

templates.forEach((template, index) => {
  console.log(`🧾 Template ${index + 1}:`, {
    id: template._id, 
    name: template.name,
    content: template.content,
  });
});

if (templates.length === 0) {
  console.warn("⚠️ No templates loaded into state.");
}

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Message Templates</h2>

      {loading && <p>Loading templates...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="mb-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create Template
        </button>
      </div>

      {showEditor && (
        <TemplateEditor
          template={editingTemplate || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {!loading && templates.length === 0 && <p>No templates found.</p>}

      <ul className="space-y-3 mt-4">
        {templates.map((template) => (
          <li
            key={template._id}
            className="p-4 bg-gray-100 rounded shadow-md flex justify-between items-start"
          >
            <div>
              <h3 className="font-semibold">{template.name}</h3>
              <p className="text-sm text-gray-700">{template.content}</p>
            </div>
            <button
              onClick={() => handleEdit(template)}
              className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TemplateLibrary;
