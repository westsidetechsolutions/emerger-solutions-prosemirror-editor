import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type="text"
        className={`
          px-3 py-2 
          border border-gray-300 
          rounded-md 
          shadow-sm 
          focus:outline-none 
          focus:ring-2 
          focus:ring-blue-500 
          focus:border-blue-500
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextInput; 