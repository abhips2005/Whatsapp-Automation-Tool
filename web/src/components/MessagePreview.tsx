import React from 'react';

interface MessagePreviewProps {
  preview: string;
  missingVars: string[];
}

const highlightMissing = (text: string) => {
  // Highlight [varName missing] patterns
  return text.split(/(\[\w+ missing\])/g).map((part, i) => {
    if (/^\[\w+ missing\]$/.test(part)) {
      return <span key={i} style={{ color: 'red', fontWeight: 'bold' }}>{part}</span>;
    }
    return part;
  });
};

export const MessagePreview: React.FC<MessagePreviewProps> = ({ preview, missingVars }) => (
  <div className="mt-6 p-4 rounded-lg border bg-gray-50">
    <div className="font-semibold mb-2">Preview:</div>
    <div className="whitespace-pre-line text-gray-800 text-base">
      {highlightMissing(preview)}
    </div>
    {missingVars.length > 0 && (
      <div className="mt-2 text-sm text-red-600">
        Missing variables: {missingVars.join(', ')}
      </div>
    )}
  </div>
); 