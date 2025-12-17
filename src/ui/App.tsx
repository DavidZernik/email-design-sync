import React, { useState, useEffect } from 'react';
import SelectionPanel from './components/SelectionPanel';
import ClientSelector from './components/ClientSelector';
import SettingsPanel from './components/SettingsPanel';
import ExportButton from './components/ExportButton';
import CodePreview from './components/CodePreview';
import WarningsPanel from './components/WarningsPanel';
import TemplateLibrary from './components/TemplateLibrary';
import Toast from './components/Toast';
import { generateEmailHTML } from '../utils/htmlGenerator';
import { detectWarnings } from '../utils/warningDetector';
import { createZipFile } from '../utils/zipCreator';

interface SelectedNode {
  id: string;
  name: string;
  type: string;
  isAutoLayout: boolean;
  width: number;
  height: number;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

function App() {
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>(['gmail', 'apple-mail', 'yahoo']);
  const [maxWidth, setMaxWidth] = useState<number>(600);
  const [minify, setMinify] = useState<boolean>(false);
  const [generatedHTML, setGeneratedHTML] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [nodeData, setNodeData] = useState<any>(null);
  const [images, setImages] = useState<Array<{hash: string, name: string, bytes: Uint8Array}>>([]);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    // Listen for messages from plugin code
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === 'selection-change') {
        setSelectedNodes(msg.selection);
        if (msg.selection.length === 1) {
          setSelectedNodeId(msg.selection[0].id);
        } else {
          setSelectedNodeId(null);
        }
      }
      
      if (msg.type === 'export-success') {
        setNodeData(msg.nodeData);
        setImages(msg.images || []);
        setIsExporting(false);
        
        // Detect warnings
        const detectedWarnings = detectWarnings(msg.nodeData);
        setWarnings(detectedWarnings);
        
        // Generate HTML
        const html = generateEmailHTML(msg.nodeData, {
          maxWidth,
          minify,
          targetClients: selectedClients,
        });
        setGeneratedHTML(html);
      }
      
      if (msg.type === 'export-error') {
        setIsExporting(false);
        setToast({ message: `Export error: ${msg.error}`, type: 'error' });
      }
    };
  }, [maxWidth, minify, selectedClients]);

  const handleExport = () => {
    if (!selectedNodeId) {
      setToast({ message: 'Please select a frame or component to export', type: 'error' });
      return;
    }
    
    setIsExporting(true);
    parent.postMessage(
      { pluginMessage: { type: 'export-email', nodeId: selectedNodeId } },
      '*'
    );
  };


  const handleCopy = () => {
    navigator.clipboard.writeText(generatedHTML).then(() => {
      setToast({ message: 'HTML copied to clipboard!', type: 'success' });
    }).catch(err => {
      setToast({ message: 'Failed to copy to clipboard', type: 'error' });
    });
  };

  const handleDownload = async () => {
    if (!generatedHTML) return;
    
    try {
      const zip = await createZipFile(generatedHTML, images, selectedNodeId || 'email');
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedNodes.find(n => n.id === selectedNodeId)?.name || 'email'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: 'ZIP file downloaded successfully!', type: 'success' });
    } catch (error) {
      setToast({ message: `Error creating ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Email Design Sync</h1>
        <button 
          className="template-button"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? 'Hide' : 'Show'} Templates
        </button>
      </div>

      {showTemplates && (
        <TemplateLibrary onSelectTemplate={setSelectedNodeId} />
      )}

      <SelectionPanel 
        nodes={selectedNodes}
        selectedId={selectedNodeId}
        onSelect={setSelectedNodeId}
      />

      <ClientSelector
        selectedClients={selectedClients}
        onChange={setSelectedClients}
      />

      <SettingsPanel
        maxWidth={maxWidth}
        onMaxWidthChange={setMaxWidth}
        minify={minify}
        onMinifyChange={setMinify}
      />

      {warnings.length > 0 && (
        <WarningsPanel warnings={warnings} />
      )}

      <ExportButton
        onClick={handleExport}
        disabled={!selectedNodeId || isExporting}
        isLoading={isExporting}
      />

      {generatedHTML && (
        <CodePreview
          html={generatedHTML}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;

