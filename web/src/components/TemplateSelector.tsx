import React, { useState } from 'react';

interface MessageTemplate {
  _id: string;
  name: string;
  content: string;
}

interface Props {
  templates: MessageTemplate[];
  onTemplateSelect: (content: string) => void;
}

const TemplateSelector: React.FC<Props> = ({ templates, onTemplateSelect }) => {
  const [search, setSearch] = useState('');

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
