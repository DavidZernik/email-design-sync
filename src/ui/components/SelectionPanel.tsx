import React from 'react';

interface SelectedNode {
  id: string;
  name: string;
  type: string;
  isAutoLayout: boolean;
  width: number;
  height: number;
}

interface Props {
  nodes: SelectedNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const SelectionPanel: React.FC<Props> = ({ nodes, selectedId, onSelect }) => {
  if (nodes.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Selection</div>
        <div className="selection-empty">
          Select a frame or component in Figma
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Selection</div>
      {nodes.map(node => (
        <div
          key={node.id}
          className={`selection-item ${selectedId === node.id ? 'selected' : ''}`}
          onClick={() => onSelect(node.id)}
        >
          <div className="selection-item-name">{node.name}</div>
          <div className="selection-item-details">
            {node.type} • {Math.round(node.width)}×{Math.round(node.height)}px
            {node.isAutoLayout && ' • Auto Layout'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SelectionPanel;

