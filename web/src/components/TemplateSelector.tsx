import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

interface MessageTemplate {
  _id: string;
  name: string;
  content: string;
}

interface Props {
  onTemplateSelect: (content: string) => void;
}

const TemplateSelector: React.FC<Props> = ({ onTemplateSelect }) => {
  console.log("✅ TemplateSelector mounted");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await ApiService.getMessageTemplates();
        console.log("Loaded templates:", response);
        setTemplates(response);
      } catch (err) {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
      <input
        type="text"
        placeholder="Search templates..."
        className="border border-gray-300 p-2 mb-3 w-full rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="space-y-2">
        {filteredTemplates.map((template) => (
          <li
            key={template._id}
            className="p-3 border rounded cursor-pointer hover:bg-gray-100"
            onClick={() => onTemplateSelect(template.content)}
          >
            <strong>{template.name}</strong>
            <p className="text-sm text-gray-600 truncate">{template.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TemplateSelector;
