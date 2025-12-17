import React from 'react';

interface Props {
  maxWidth: number;
  onMaxWidthChange: (width: number) => void;
  minify: boolean;
  onMinifyChange: (minify: boolean) => void;
}

const SettingsPanel: React.FC<Props> = ({ maxWidth, onMaxWidthChange, minify, onMinifyChange }) => {
  return (
    <div className="panel">
      <div className="panel-title">Export Settings</div>
      <div className="settings-row">
        <span className="settings-label">Max Width (px)</span>
        <input
          type="number"
          className="settings-input"
          value={maxWidth}
          onChange={(e) => onMaxWidthChange(parseInt(e.target.value) || 600)}
          min={400}
          max={800}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Minify HTML</span>
        <div
          className={`settings-toggle ${minify ? 'active' : ''}`}
          onClick={() => onMinifyChange(!minify)}
        >
          <div className="settings-toggle-slider"></div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

