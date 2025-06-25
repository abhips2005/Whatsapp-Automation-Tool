import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  selectedFile?: File | null;
}

const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_SIZE_MB = 25;

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, selectedFile }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine file type
  const getFileType = (file: File): 'image' | 'document' => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(ext) ? 'image' : 'document';
  };

  // Get file icon based on extension
  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      pdf: '📄',
      doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️'
    };
    return iconMap[ext] || '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      alert('Unsupported file type. Please upload an image (JPG, PNG, GIF, WebP) or document (PDF, DOC, XLS, PPT).');
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      alert(`File size exceeds ${MAX_SIZE_MB}MB. Please upload a smaller file.`);
      return;
    }

    // Handle image preview
    if (getFileType(file) === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileType = selectedFile ? getFileType(selectedFile) : null;

  return (
    <div className="relative">
      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      <div className={`p-6 border-2 border-dashed rounded-lg transition-colors relative ${
        selectedFile ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
      }`}>
        {selectedFile && (
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-sm z-20"
            title="Remove file"
          >
            ✖
          </button>
        )}

        <div className="flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {selectedFile ? (
            <div className="w-full">
              {fileType === 'image' && preview ? (
                <div className="flex flex-col items-center space-y-3">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg shadow-md"
                  />
                  <div className="text-sm text-indigo-700 font-medium break-words">
                    {getFileIcon(selectedFile.name)} <strong>{selectedFile.name}</strong>
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 text-2xl">{getFileIcon(selectedFile.name)}</span>
                  </div>
                  <div className="text-sm text-indigo-700 font-medium break-words text-center">
                    <strong>{selectedFile.name}</strong>
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-indigo-600 text-xl">📎</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Upload File</span>
              <span className="text-xs text-gray-500 mt-1">
                Images: JPG, PNG, GIF, WebP<br />
                Documents: PDF, DOC, XLS, PPT<br />
                (max {MAX_SIZE_MB}MB)
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 