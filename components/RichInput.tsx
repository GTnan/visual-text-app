import React, { useRef, useEffect, useState } from 'react';

interface RichInputProps {
  label: string;
  placeholderHtml: string;
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  bgColor?: string;
}

export const RichInput: React.FC<RichInputProps> = ({ 
  label, 
  placeholderHtml, 
  value, 
  onChange, 
  readOnly = false,
  minHeight = "h-64",
  bgColor = "bg-white"
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value changes to innerHTML, but only if not focused (to prevent cursor jumping)
  useEffect(() => {
    if (contentEditableRef.current && !isFocused && value !== contentEditableRef.current.innerHTML) {
      if (value === '') {
         contentEditableRef.current.innerHTML = placeholderHtml;
      } else {
         contentEditableRef.current.innerHTML = value;
      }
    }
    // Handle initial load specific case
    if (contentEditableRef.current && value === '' && !isFocused) {
        contentEditableRef.current.innerHTML = placeholderHtml;
    }
  }, [value, isFocused, placeholderHtml]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (contentEditableRef.current) {
      onChange(contentEditableRef.current.innerHTML);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Clear placeholder logic if needed, but for rich text usually we just let user delete
    // Simple logic: if content matches placeholder exactly, clear it? 
    // For this app, we'll let the user decide what to delete to keep it simple and robust.
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          {label}
        </label>
        {!readOnly && (
            <span className="text-xs text-gray-400 font-light">支持富文本粘贴</span>
        )}
      </div>
      <div 
        className={`
          flex-grow w-full rounded-xl border-2 transition-all duration-200 ease-in-out overflow-hidden
          ${isFocused ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}
          ${bgColor}
        `}
      >
        <div
          ref={contentEditableRef}
          className={`
            w-full h-full p-4 outline-none overflow-y-auto text-gray-800 rich-editor-content
            ${minHeight} 
            ${readOnly ? 'cursor-default' : 'cursor-text'}
          `}
          contentEditable={!readOnly}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};
