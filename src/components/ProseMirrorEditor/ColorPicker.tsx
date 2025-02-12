import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  onClose: () => void;
  initialColor?: string;
  title: string;
}

const ColorPicker = ({ onColorSelect, onClose, initialColor = '#000000', title }: ColorPickerProps) => {
  const [color, setColor] = useState(initialColor);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
  };

  const handleApply = () => {
    onColorSelect(color);
    onClose();
  };

  return (
    <div className="color-picker-dropdown">
      <div className="color-picker-header">{title}</div>
      <HexColorPicker color={color} onChange={handleColorChange} />
      <div className="color-picker-footer">
        <button onClick={handleApply} className="apply-button">Apply</button>
        <button onClick={onClose} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
};

export default ColorPicker; 