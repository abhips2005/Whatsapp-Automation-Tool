import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  onFileChange: (file: File | null) => void;
  previewWidth?: number;
  previewHeight?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onFileChange, previewWidth = 200, previewHeight = 200 }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileChange(file);
    } else {
      setPreview(null);
      onFileChange(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ marginBottom: '1rem' }}
      />
      {preview && (
        <div style={{ marginBottom: '1rem' }}>
          <img
            src={preview}
            alt="Preview"
            style={{ width: previewWidth, height: previewHeight, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          />
          <button onClick={handleRemove} style={{ display: 'block', margin: '0.5rem auto 0', color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 