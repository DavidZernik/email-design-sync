import React from 'react';

interface Props {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

const ExportButton: React.FC<Props> = ({ onClick, disabled, isLoading }) => {
  return (
    <button
      className={`export-button export-button-compact ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isLoading ? 'Converting...' : 'Convert Figma Design to HTML'}
    </button>
  );
};

export default ExportButton;

