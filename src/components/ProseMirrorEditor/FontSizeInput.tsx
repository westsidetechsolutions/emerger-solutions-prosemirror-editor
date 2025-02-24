import React from 'react';

interface FontSizeInputProps {
  value: number;
  onChange: (size: number) => void;
  editorView: any; // EditorView reference
}

const FontSizeInput: React.FC<FontSizeInputProps> = ({ value, onChange, editorView }) => {
  const handleButtonClick = (newSize: number, e: React.MouseEvent) => {
    // Prevent default to avoid losing focus
    e.preventDefault();
    
    // Apply the size change
    onChange(newSize);
    
    // Refocus the editor after a short delay
    setTimeout(() => {
      if (editorView) {
        editorView.focus();
      }
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="font-size-input">
      <button 
        onMouseDown={(e) => handleButtonClick(value - 1, e)}
        className="font-size-btn"
      >
        -
      </button>
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min="8"
        max="72"
        className="font-size-number"
        onBlur={() => editorView?.focus()}
      />
      <button 
        onMouseDown={(e) => handleButtonClick(value + 1, e)}
        className="font-size-btn"
      >
        +
      </button>
    </div>
  );
};

export default FontSizeInput; 