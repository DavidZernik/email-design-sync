import React from 'react';

interface Props {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

const ExportButton: React.FC<Props> = ({ onClick, disabled, isLoading }) => {
  return (
    <button
      className={`export-button ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isLoading ? 'Exporting...' : 'Export to HTML'}
    </button>
  );
};

export default ExportButton;

