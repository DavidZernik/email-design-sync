import React, { useState, useEffect } from 'react';
import SelectionPanel from '../ui/components/SelectionPanel';
import ClientSelector from '../ui/components/ClientSelector';
import SettingsPanel from '../ui/components/SettingsPanel';
import ExportButton from '../ui/components/ExportButton';
import CodePreview from '../ui/components/CodePreview';
import WarningsPanel from '../ui/components/WarningsPanel';
import TemplateLibrary from '../ui/components/TemplateLibrary';
import Toast from '../ui/components/Toast';
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

function WebApp() {
  const [accessToken, setAccessToken] = useState<string>('');
  const [fileKey, setFileKey] = useState<string>('');
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>(['gmail', 'apple-mail', 'yahoo']);
  const [maxWidth, setMaxWidth] = useState<number>(600);
  const [minify, setMinify] = useState<boolean>(false);
  const [generatedHTML, setGeneratedHTML] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [nodeData, setNodeData] = useState<any>(null);
  const [images, setImages] = useState<Array<{hash: string, name: string, bytes: Uint8Array}>>([]);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Load access token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('figma_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
  }, []);

  const handleLoadFile = async () => {
    if (!fileKey || !accessToken) {
      setToast({ message: 'Please enter file key and access token', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      // Get file info and list nodes via proxy to avoid CORS issues
      const response = await fetch(`/api/figma/files/${fileKey}?accessToken=${encodeURIComponent(accessToken)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load file: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract frames and components
      const nodes: SelectedNode[] = [];
      function traverse(node: any) {
        if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
          nodes.push({
            id: node.id,
            name: node.name,
            type: node.type,
            isAutoLayout: node.layoutMode && node.layoutMode !== 'NONE',
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0,
          });
        }
        if (node.children) {
          node.children.forEach((child: any) => traverse(child));
        }
      }

      if (data.document) {
        traverse(data.document);
      }

      setSelectedNodes(nodes);
      localStorage.setItem('figma_access_token', accessToken);
      setToast({ message: `Loaded ${nodes.length} nodes from file`, type: 'success' });
    } catch (error) {
      setToast({ message: `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedNodeId || !fileKey || !accessToken) {
      setToast({ message: 'Please select a node and ensure file key and access token are set', type: 'error' });
      return;
    }

    setIsExporting(true);
    try {
      // Fetch node data from Figma API
      const response = await fetch(`/api/figma/files/${fileKey}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeIds: [selectedNodeId],
          accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to export: ${response.statusText}`);
      }

      const figmaData = await response.json();
      
      // Transform Figma API response to our nodeData format
      const node = figmaData.nodes[selectedNodeId];
      if (!node) {
        throw new Error('Node not found in response');
      }

      const transformedData = transformFigmaNode(node.document);
      setNodeData(transformedData);

      // Detect warnings
      const detectedWarnings = detectWarnings(transformedData);
      setWarnings(detectedWarnings);

      // Generate HTML
      const html = generateEmailHTML(transformedData, {
        maxWidth,
        minify,
        targetClients: selectedClients,
      });
      setGeneratedHTML(html);

      // Note: Image extraction would require additional API calls
      setImages([]);

      setToast({ message: 'Export successful!', type: 'success' });
    } catch (error) {
      setToast({ message: `Export error: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Transform Figma API node structure to our internal format
  function transformFigmaNode(node: any): any {
    const result: any = {
      id: node.id,
      name: node.name,
      type: node.type,
    };

    if (node.absoluteBoundingBox) {
      result.width = node.absoluteBoundingBox.width;
      result.height = node.absoluteBoundingBox.height;
      result.x = node.absoluteBoundingBox.x;
      result.y = node.absoluteBoundingBox.y;
    }

    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      if (node.layoutMode && node.layoutMode !== 'NONE') {
        result.layoutMode = node.layoutMode;
        result.paddingLeft = node.paddingLeft || 0;
        result.paddingRight = node.paddingRight || 0;
        result.paddingTop = node.paddingTop || 0;
        result.paddingBottom = node.paddingBottom || 0;
        result.itemSpacing = node.itemSpacing || 0;
        result.primaryAxisAlignItems = node.primaryAxisAlignItems;
        result.counterAxisAlignItems = node.counterAxisAlignItems;
      }

      if (node.fills && Array.isArray(node.fills)) {
        result.fills = node.fills.map((fill: any) => ({
          type: fill.type,
          visible: fill.visible !== false,
          opacity: fill.opacity || 1,
          color: fill.type === 'SOLID' && fill.color 
            ? `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.opacity || 1})`
            : null,
        }));
      }
    }

    if (node.type === 'TEXT') {
      result.characters = node.characters || '';
      result.fontSize = node.style?.fontSize || 16;
      result.fontFamily = node.style?.fontFamily || 'Arial';
      result.fontWeight = node.style?.fontWeight || 400;
      
      if (node.fills && Array.isArray(node.fills)) {
        result.fills = node.fills.map((fill: any) => ({
          type: fill.type,
          visible: fill.visible !== false,
          opacity: fill.opacity || 1,
          color: fill.type === 'SOLID' && fill.color
            ? `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.opacity || 1})`
            : null,
        }));
      }
    }

    if (node.children && Array.isArray(node.children)) {
      result.children = node.children.map((child: any) => transformFigmaNode(child));
    }

    return result;
  }

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
        <h1>Email Design Sync - Web Interface</h1>
        <button 
          className="template-button"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? 'Hide' : 'Show'} Templates
        </button>
      </div>

      {/* Figma Connection Panel */}
      <div style={{ 
        padding: '16px', 
        background: '#fff', 
        borderRadius: '8px', 
        border: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Connect to Figma</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: '#666' }}>
            Figma Access Token
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Enter your Figma personal access token"
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '4px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </label>
          <a 
            href="https://www.figma.com/developers/api#access-tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: '#6366f1', textDecoration: 'none' }}
          >
            How to get a Figma access token
          </a>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#666' }}>
              Figma File Key
              <input
                type="text"
                value={fileKey}
                onChange={(e) => setFileKey(e.target.value)}
                placeholder="e.g., abc123xyz"
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </label>
            <span style={{ fontSize: '11px', color: '#999' }}>
              Extract from Figma file URL: figma.com/file/[FILE_KEY]/...
            </span>
          </div>
          <button
            onClick={handleLoadFile}
            disabled={!fileKey || !accessToken || isLoading}
            style={{
              padding: '8px 16px',
              background: isLoading ? '#ccc' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {isLoading ? 'Loading...' : 'Load File'}
          </button>
        </div>
      </div>

      {showTemplates && (
        <TemplateLibrary onSelectTemplate={setSelectedNodeId} />
      )}

      {selectedNodes.length > 0 && (
        <>
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
        </>
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

export default WebApp;

