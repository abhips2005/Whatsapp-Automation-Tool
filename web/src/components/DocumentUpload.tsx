// components/DocumentUpload.tsx
import React from 'react';

interface DocumentUploadProps {
  file: File | null;
  setFile: (file: File | null) => void;
}

const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const MAX_SIZE_MB = 25;

const DocumentUpload: React.FC<DocumentUploadProps> = ({ file, setFile }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop()?.toLowerCase();
    const sizeMB = selected.size / 1024 / 1024;

    if (!ext || !allowedExtensions.includes(ext)) {
      alert('Unsupported file type. Please upload a PDF, Word, Excel, or PowerPoint file.');
      return;
    }

    if (sizeMB > MAX_SIZE_MB) {
      alert('File size exceeds 25MB. Please upload a smaller file.');
      return;
    }

    setFile(selected);
    e.target.value = '';
  };

  const handleRemove = () => setFile(null);

  return (
    <div className="relative">
      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      <div className={`p-6 border-2 border-dashed rounded-lg transition-colors relative ${
        file ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
      }`}>
        {file && (
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-sm z-20"
            title="Remove file"
          >
            ✖
          </button>
        )}

        <div className="flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {file ? (
            <div className="text-sm text-indigo-700 font-medium break-words text-left w-full">
              📄 <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-indigo-600 text-xl">📎</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Upload Document</span>
              <span className="text-xs text-gray-500 mt-1">PDF, DOC, XLS, PPT (max 25MB)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
