import React, { useState, useMemo } from 'react';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    let filtered = nodes;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
      );
    }
    
    // Sort by size (largest first), then by name
    return filtered.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (Math.abs(areaA - areaB) > 10000) {
        return areaB - areaA; // Sort by area (largest first)
      }
      return a.name.localeCompare(b.name); // Then by name
    });
  }, [nodes, searchQuery]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="panel-title">Selection ({filteredNodes.length} of {nodes.length})</div>
      </div>
      
      <input
        type="text"
        placeholder="Search frames..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="settings-input"
        style={{
          width: '100%',
          marginBottom: '12px',
          padding: '8px 12px',
          fontSize: '13px'
        }}
      />
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredNodes.map(node => (
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
      
      {filteredNodes.length === 0 && searchQuery && (
        <div className="selection-empty" style={{ marginTop: '12px' }}>
          No frames found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default SelectionPanel;

