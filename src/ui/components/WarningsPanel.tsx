import React from 'react';

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

interface Props {
  warnings: Warning[];
}

const WarningsPanel: React.FC<Props> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return '!';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  };

  return (
    <div className="warnings-panel">
      <div className="panel-title">Compatibility Warnings</div>
      {warnings.map((warning, index) => (
        <div key={index} className="warning-item">
          <div className={`warning-icon ${warning.type}`}>
            {getIcon(warning.type)}
          </div>
          <div>{warning.message}</div>
        </div>
      ))}
    </div>
  );
};

export default WarningsPanel;

