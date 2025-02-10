import React, { useRef, useState } from 'react';

interface FileInputProps {
  onChange: (files: FileList | null) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  className?: string;
  label?: React.ReactNode;
}

const FileInput: React.FC<FileInputProps> = ({
  onChange,
  accept,
  multiple = false,
  className = '',
  label = 'Choose File'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        await onChange(files);
      } catch (error) {
        console.error('Error in onChange handler:', error);
        alert('There was an error uploading your files. Please try again.');
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Reset input
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={className}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : label}
      </button>
    </div>
  );
};

export default FileInput; 