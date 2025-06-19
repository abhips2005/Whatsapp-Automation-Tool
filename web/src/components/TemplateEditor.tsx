import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface TemplateEditorProps {
  template?: {
    _id: string;
    name: string;
    content: string;
  };
  onSave: () => void;
  onCancel: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (template) {
        await ApiService.updateMessageTemplate(template._id, { name, content });
      } else {
        await ApiService.saveMessageTemplate({ name, content });
      }
      onSave(); // Refresh parent view
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow-md max-w-md">
      <h2 className="text-lg font-bold mb-4">
        {template ? 'Edit Template' : 'Create New Template'}
      </h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Template Name</label>
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter a title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message Content</label>
          <textarea
            className="w-full border p-2 rounded"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Write your message here..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            {saving ? 'Saving...' : template ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateEditor;
