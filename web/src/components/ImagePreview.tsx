import React from 'react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  onRemove?: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt = 'Preview', width = 200, height = 200, onRemove }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
      <img
        src={src}
        alt={alt}
        style={{ width, height, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ display: 'block', margin: '0.5rem auto 0', color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Remove
        </button>
      )}
    </div>
  );
};

export default ImagePreview; 