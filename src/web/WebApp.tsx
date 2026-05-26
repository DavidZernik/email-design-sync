import React, { useState, useEffect } from 'react';
import SelectionPanel from '../ui/components/SelectionPanel';
import ClientSelector, { EMAIL_CLIENTS } from '../ui/components/ClientSelector';
import SettingsPanel from '../ui/components/SettingsPanel';
import ExportButton from '../ui/components/ExportButton';
import CodePreview from '../ui/components/CodePreview';
import WarningsPanel from '../ui/components/WarningsPanel';
import Toast from '../ui/components/Toast';
import { generateEmailHTML } from '../utils/htmlGenerator';
import { detectWarnings } from '../utils/warningDetector';
import { createZipFile } from '../utils/zipCreator';
import { DEMO_DOCUMENT, DEMO_ROOT_ID } from './demoFixture';
import sampleEmailHtml from './sampleEmail.html';

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
  const [fileLoaded, setFileLoaded] = useState<boolean>(false);
  const [documentNodeId, setDocumentNodeId] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>(['gmail', 'apple-mail', 'yahoo']);
  const [maxWidth, setMaxWidth] = useState<number>(600);
  const [minify, setMinify] = useState<boolean>(false);
  const [generatedHTML, setGeneratedHTML] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [nodeData, setNodeData] = useState<any>(null);
  const [images, setImages] = useState<Array<{hash: string, name: string, bytes: Uint8Array}>>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [renderStage, setRenderStage] = useState<number>(-1);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [fileKeyError, setFileKeyError] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState<boolean>(false);

  // Load access token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('figma_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
  }, []);

  // Verify token when it changes
  const verifyToken = async (token: string) => {
    if (!token || token.length < 10) {
      setTokenValid(null);
      return;
    }

    try {
      const response = await fetch(`/api/figma/verify-token?accessToken=${encodeURIComponent(token)}`);
      const data = await response.json();
      
      if (data.valid) {
        console.log('[verifyToken] Token is valid for user:', data.user);
        setTokenValid(true);
      } else {
        console.warn('[verifyToken] Token is invalid:', data.error);
        setTokenValid(false);
      }
    } catch (error) {
      console.error('[verifyToken] Error verifying token:', error);
      setTokenValid(false);
    }
  };

  // Verify token when accessToken changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (accessToken) {
        verifyToken(accessToken);
      } else {
        setTokenValid(null);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [accessToken]);

  const handleConnectFigma = () => {
    let hasError = false;
    const tokenTrimmed = accessToken.trim();
    const fileKeyTrimmed = fileKey.trim();

    if (!tokenTrimmed) {
      setTokenError('Required.');
      hasError = true;
    } else if (tokenTrimmed.length < 30) {
      setTokenError('Figma tokens are typically 40+ characters. Check that you pasted the full token.');
      hasError = true;
    } else if (!/^[A-Za-z0-9_-]+$/.test(tokenTrimmed)) {
      setTokenError('Tokens contain only letters, numbers, hyphens, and underscores. Check for stray spaces or quotes.');
      hasError = true;
    } else {
      setTokenError(null);
    }

    if (!fileKeyTrimmed) {
      setFileKeyError('Required.');
      hasError = true;
    } else if (!/^[A-Za-z0-9]{15,40}$/.test(fileKeyTrimmed)) {
      setFileKeyError('File keys are 15-40 alphanumeric characters. Copy just the key from your Figma file URL: figma.com/file/[KEY]/...');
      hasError = true;
    } else {
      setFileKeyError(null);
    }

    if (!hasError) {
      setShowAccessModal(true);
    }
  };

  const handleLoadDemo = () => {
    setIsDemo(true);
    setDocumentNodeId(DEMO_ROOT_ID);
    setSelectedNodeId(DEMO_ROOT_ID);
    setSelectedNodes([{
      id: DEMO_ROOT_ID,
      name: 'AT&T iPhone Promo',
      type: 'FRAME',
      isAutoLayout: true,
      width: 700,
      height: 1400,
    }]);
    setFileLoaded(true);
  };

  const handleLoadFile = async () => {
    console.log('[handleLoadFile] Starting file load...');
    console.log('[handleLoadFile] File Key:', fileKey);
    console.log('[handleLoadFile] Access Token (first 10 chars):', accessToken ? accessToken.substring(0, 10) + '...' : 'missing');
    
    if (!fileKey || !accessToken) {
      console.warn('[handleLoadFile] Missing fileKey or accessToken');
      setToast({ message: 'Please enter file key and access token', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = `/api/figma/files/${fileKey}?accessToken=${encodeURIComponent(accessToken)}`;
      console.log('[handleLoadFile] Fetching from:', apiUrl);
      
      // Get file info and list nodes via proxy to avoid CORS issues
      const response = await fetch(apiUrl);
      
      console.log('[handleLoadFile] Response status:', response.status, response.statusText);
      console.log('[handleLoadFile] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string; details?: any };
        console.error('[handleLoadFile] Error response:', errorData);
        console.error('[handleLoadFile] Full response status:', response.status);
        
        let errorMessage = errorData.error || `Failed to load file: ${response.statusText}`;
        
        // Provide more helpful error messages
        if (response.status === 404) {
          errorMessage = 'File not found. If the file is in a private team, ensure your token has access to that team workspace. Verify: (1) File key is correct, (2) Token has team permissions, (3) File exists';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. If this is a private team file, your token needs permission to access that team workspace.';
        } else if (response.status === 401) {
          errorMessage = 'Invalid access token. Please check your Figma access token.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json() as { document?: any };
      console.log('[handleLoadFile] Received data:', data);
      console.log('[handleLoadFile] Has document?', !!data.document);
      
      // Extract frames and components - filter to show only meaningful top-level frames
      const nodes: SelectedNode[] = [];
      const MIN_WIDTH = 200; // Minimum width to show (filter out tiny UI elements)
      const MIN_HEIGHT = 100; // Minimum height to show
      
      function traverse(node: any, depth: number = 0) {
        const isFrame = node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
        
        if (isFrame) {
          const width = node.absoluteBoundingBox?.width || 0;
          const height = node.absoluteBoundingBox?.height || 0;
          
          // Only include frames that are:
          // 1. Large enough to be meaningful (not tiny UI elements)
          // 2. OR at the root level (depth 0-2) regardless of size
          // 3. Skip very small nested elements (depth > 3 and small size)
          const isLargeEnough = width >= MIN_WIDTH && height >= MIN_HEIGHT;
          const isTopLevel = depth <= 2;
          const shouldInclude = isLargeEnough || isTopLevel;
          
          if (shouldInclude) {
            nodes.push({
              id: node.id,
              name: node.name,
              type: node.type,
              isAutoLayout: node.layoutMode && node.layoutMode !== 'NONE',
              width: width,
              height: height,
            });
          }
        }
        
        if (node.children) {
          node.children.forEach((child: any) => traverse(child, depth + 1));
        }
      }

      if (data.document) {
        console.log('[handleLoadFile] Traversing document tree...');
        console.log('[handleLoadFile] Document structure:', {
          type: data.document.type,
          name: data.document.name,
          id: data.document.id,
          hasChildren: !!data.document.children,
          childrenCount: data.document.children?.length || 0
        });
        
        // Set the document node ID to export the entire file
        console.log('[handleLoadFile] Setting document node ID:', data.document.id);
        setDocumentNodeId(data.document.id);
        setSelectedNodeId(data.document.id);
        
        console.log('[handleLoadFile] Starting traversal with depth tracking...');
        traverse(data.document);
        console.log('[handleLoadFile] Traversal complete. Found nodes:', nodes.length);
        console.log('[handleLoadFile] Node details:', nodes.slice(0, 10).map(n => ({ id: n.id, name: n.name, type: n.type, size: `${n.width}×${n.height}` })));
        
        setSelectedNodes(nodes);
        localStorage.setItem('figma_access_token', accessToken);
        setFileLoaded(true);
        console.log('[handleLoadFile] Successfully loaded file. Ready to export entire document.');
        setToast({ message: 'File loaded! Ready to export.', type: 'success' });
      } else {
        console.warn('[handleLoadFile] No document found in response');
        setToast({ message: 'File loaded but no document structure found', type: 'error' });
      }
    } catch (error) {
      console.error('[handleLoadFile] Error caught:', error);
      console.error('[handleLoadFile] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setToast({ message: `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setIsLoading(false);
      console.log('[handleLoadFile] Finished (loading:', false, ')');
    }
  };

  const handleExport = async () => {
    console.log('[handleExport] Starting export...');
    console.log('[handleExport] File Key:', fileKey);
    
    // Use document node ID if available, otherwise fall back to selected node
    const nodeIdToExport = documentNodeId || selectedNodeId;

    if (isDemo) {
      setIsExporting(true);
      setGeneratedHTML('');
      setWarnings([]);
      setImages([]);
      setRenderStage(0);
      const stageCount = 5;
      const stageMs = 2000;
      for (let i = 1; i <= stageCount; i++) {
        setTimeout(() => setRenderStage(i), stageMs * i);
      }
      setTimeout(() => {
        setGeneratedHTML(sampleEmailHtml);
        setIsExporting(false);
        setRenderStage(-1);
        setToast({ message: 'Rendered. Scroll down to see the HTML.', type: 'success' });
        setTimeout(() => {
          const codePreview = document.querySelector('.code-preview');
          if (codePreview) codePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }, stageMs * stageCount);
      return;
    }

    if (!nodeIdToExport || !fileKey || !accessToken) {
      console.warn('[handleExport] Missing required data');
      setToast({ message: 'Please load a file first', type: 'error' });
      return;
    }
    
    console.log('[handleExport] Exporting node ID:', nodeIdToExport);

    setIsExporting(true);
    try {
      const requestBody = {
        nodeIds: [nodeIdToExport],
        accessToken,
      };
      console.log('[handleExport] Request body:', { ...requestBody, accessToken: accessToken.substring(0, 10) + '...' });
      
      // Fetch node data from Figma API
      const response = await fetch(`/api/figma/files/${fileKey}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[handleExport] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleExport] Error response:', errorText);
        throw new Error(`Failed to export: ${response.statusText}`);
      }

      const figmaData = await response.json() as { nodes: Record<string, { document: any }> };
      console.log('[handleExport] Received Figma data:', figmaData);
      
      // Transform Figma API response to our nodeData format
      const node = figmaData.nodes[nodeIdToExport];
      console.log('[handleExport] Node data:', node);
      
      if (!node) {
        console.error('[handleExport] Node not found in response. Available nodes:', Object.keys(figmaData.nodes || {}));
        throw new Error('Node not found in response');
      }

      console.log('[handleExport] Transforming node data...');
      console.log('[handleExport] Node document structure:', {
        type: node.document.type,
        name: node.document.name,
        hasChildren: !!node.document.children,
        childrenCount: node.document.children?.length || 0
      });
      const transformedData = transformFigmaNode(node.document);
      console.log('[handleExport] Transformed data structure:', {
        id: transformedData.id,
        name: transformedData.name,
        type: transformedData.type,
        width: transformedData.width,
        height: transformedData.height,
        hasChildren: !!transformedData.children,
        childrenCount: transformedData.children?.length || 0
      });
      setNodeData(transformedData);

      // Detect warnings
      console.log('[handleExport] Detecting warnings...');
      const detectedWarnings = detectWarnings(transformedData);
      console.log('[handleExport] Detected warnings:', detectedWarnings.length, detectedWarnings);
      setWarnings(detectedWarnings);

      // Generate HTML
      console.log('[handleExport] Generating HTML with options:', {
        maxWidth,
        minify,
        targetClients: selectedClients
      });
      const html = generateEmailHTML(transformedData, {
        maxWidth,
        minify,
        targetClients: selectedClients,
      });
      console.log('[handleExport] Generated HTML:', {
        length: html.length,
        firstChars: html.substring(0, 200),
        lastChars: html.substring(html.length - 200)
      });
      setGeneratedHTML(html);

      // Note: Image extraction would require additional API calls
      setImages([]);

      console.log('[handleExport] Export successful!');
      setToast({ message: 'Export successful! Scroll down to see the HTML code.', type: 'success' });
      
      // Scroll to the code preview section after a short delay
      setTimeout(() => {
        const codePreview = document.querySelector('.code-preview');
        if (codePreview) {
          codePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('[handleExport] Error caught:', error);
      console.error('[handleExport] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setToast({ message: `Export error: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setIsExporting(false);
      console.log('[handleExport] Finished (exporting:', false, ')');
    }
  };

  // Transform Figma API node structure to our internal format
  function transformFigmaNode(node: any): any {
    console.log('[transformFigmaNode] Transforming node:', node.id, node.name, node.type);
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
      console.log('[transformFigmaNode] Processing', node.children.length, 'children for', node.name);
      result.children = node.children.map((child: any) => transformFigmaNode(child));
      console.log('[transformFigmaNode] Finished processing children for', node.name);
    }

    console.log('[transformFigmaNode] Completed transformation for', node.name);
    return result;
  }

  const handleCopy = () => {
    console.log('[handleCopy] Copying HTML to clipboard, length:', generatedHTML.length);
    navigator.clipboard.writeText(generatedHTML).then(() => {
      console.log('[handleCopy] Successfully copied to clipboard');
      setToast({ message: 'HTML copied to clipboard!', type: 'success' });
    }).catch((err: unknown) => {
      console.error('[handleCopy] Failed to copy to clipboard:', err);
      setToast({ message: 'Failed to copy to clipboard', type: 'error' });
    });
  };

  const handleDownload = async () => {
    console.log('[handleDownload] Starting download...');
    if (!generatedHTML) {
      console.warn('[handleDownload] No HTML to download');
      return;
    }
    
    try {
      console.log('[handleDownload] Creating ZIP file with:', {
        htmlLength: generatedHTML.length,
        imageCount: images.length,
        filename: selectedNodes.find(n => n.id === selectedNodeId)?.name || 'email'
      });
      const zip = await createZipFile(generatedHTML, images, documentNodeId || selectedNodeId || 'email');
      console.log('[handleDownload] ZIP file created, size:', zip.size, 'bytes');
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${selectedNodes.find(n => n.id === selectedNodeId)?.name || 'email'}.zip`;
      a.download = fileName;
      console.log('[handleDownload] Triggering download:', fileName);
      a.click();
      URL.revokeObjectURL(url);
      console.log('[handleDownload] Download triggered successfully');
      setToast({ message: 'ZIP file downloaded successfully!', type: 'success' });
    } catch (error) {
      console.error('[handleDownload] Error creating ZIP:', error);
      setToast({ message: `Error creating ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-header-top">
          <h1>Instant Figma Design to HTML Email</h1>
        </div>
        <p className="intro-text">
          Uses the Figma API to turn a design file into a bullet-proof HTML email that renders correctly in Gmail, Apple Mail, and Outlook. Simply point the app to your design file, and the email is done.
          <a href="https://github.com/DavidZernik/email-design-sync" target="_blank" rel="noopener noreferrer" className="repo-link">View on GitHub</a>
        </p>
      </div>

      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#000000', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Get started</h2>

        <div style={{
          background: '#2d601d',
          color: '#FFFFFF',
          borderRadius: '10px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)' }}>
            Option 1, recommended
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={handleLoadDemo}
              style={{
                background: '#FFFFFF',
                color: '#2d601d',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em'
              }}
            >
              Try the demo
            </button>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
              No Figma account needed. Loads a sample design.
            </span>
          </div>
          {isDemo && (
            <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 600 }}>
              Demo mode active. Scroll down to export.
            </div>
          )}
        </div>

        {!isDemo && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '10px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.55)' }}>
            Option 2, connect your own Figma account
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#000000', letterSpacing: '-0.01em' }}>
              Figma Access Token
              <input
                type="password"
                value={accessToken}
                onChange={(e) => { setAccessToken((e.target as HTMLInputElement).value); setTokenError(null); }}
                placeholder="Enter your Figma personal access token"
                className="settings-input"
                style={{ width: '100%', marginTop: '8px', borderColor: tokenError ? '#000000' : undefined }}
              />
            </label>
            {tokenError ? (
              <span style={{ fontSize: '12px', color: '#000000', fontWeight: 600 }}>{tokenError}</span>
            ) : (
              <a
                href="https://www.figma.com/developers/api#access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#2d601d', textDecoration: 'none', fontWeight: 500 }}
              >
                How to get a Figma access token
              </a>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#000000', letterSpacing: '-0.01em' }}>
              Figma File Key
              <input
                type="text"
                value={fileKey}
                onChange={(e) => { setFileKey((e.target as HTMLInputElement).value); setFileKeyError(null); }}
                placeholder="e.g., abc123xyz"
                className="settings-input"
                style={{ width: '100%', marginTop: '8px', borderColor: fileKeyError ? '#000000' : undefined }}
              />
            </label>
            {fileKeyError ? (
              <span style={{ fontSize: '12px', color: '#000000', fontWeight: 600 }}>{fileKeyError}</span>
            ) : (
              <span style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>
                Extract from Figma file URL: figma.com/file/[FILE_KEY]/...
              </span>
            )}
          </div>

          <button
            onClick={handleConnectFigma}
            className="export-button export-button-compact"
            style={{ marginTop: '4px' }}
          >
            Connect to Figma
          </button>
        </div>
        )}
      </div>

      {fileLoaded && (
        <>
          <ClientSelector
            selectedClients={selectedClients}
            onChange={setSelectedClients}
          />

          {warnings.length > 0 && (
            <WarningsPanel warnings={warnings} />
          )}

          <ExportButton
            onClick={handleExport}
            disabled={isExporting}
            isLoading={isExporting}
          />

          {isDemo && (
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#000000', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Sample Figma design</h2>
                <span style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>AT&amp;T iPhone Promo (700px wide)</span>
              </div>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0, 0, 0, 0.15)', background: '#FFFFFF' }}>
                <iframe
                  srcDoc={sampleEmailHtml}
                  title="Sample design preview"
                  style={{ width: '100%', height: '720px', border: 'none', display: 'block', background: '#ffffff' }}
                  sandbox=""
                />
              </div>
            </div>
          )}

          {generatedHTML && (
            <>
              <div style={{
                padding: '16px',
                background: 'rgba(45, 96, 29, 0.06)',
                borderRadius: '8px',
                border: '1px solid #2d601d',
                marginTop: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#000000', marginBottom: '4px' }}>
                  HTML generated
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.7)' }}>
                  Use the buttons below to copy or download the code.
                </div>
              </div>
              <CodePreview
                html={generatedHTML}
                onCopy={handleCopy}
                onDownload={handleDownload}
              />
            </>
          )}
        </>
      )}

      {showAccessModal && (
        <div className="render-overlay" onClick={() => setShowAccessModal(false)}>
          <div className="render-panel" style={{ maxWidth: '480px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="render-title">Request access</div>
              <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.85)' }}>
                Connecting your own Figma account is currently invite-only while we test on real designs. Reach out and David will get you set up.
              </div>
              <a
                href="mailto:david@blueinboxllc.com?subject=Figma%20Design%20Sync%20access"
                style={{
                  background: '#2d601d',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  textAlign: 'center',
                  letterSpacing: '-0.01em'
                }}
              >
                Email david@blueinboxllc.com
              </a>
              <button
                onClick={() => setShowAccessModal(false)}
                style={{
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isExporting && isDemo && renderStage >= 0 && (
        <div className="render-overlay">
          <div className="render-panel">
            <div className="render-panel-header">
              <div className="render-spinner" />
              <div>
                <div className="render-title">Rendering email</div>
                <div className="render-subtitle">Converting Figma layers into bullet-proof HTML</div>
              </div>
            </div>
            <ul className="render-stages">
              {(() => {
                const labels = EMAIL_CLIENTS
                  .filter(c => selectedClients.includes(c.id))
                  .map(c => c.label);
                const optimizeLabel = labels.length === 0
                  ? 'Optimizing for all major clients'
                  : `Optimizing for ${labels.join(', ')}`;
                return [
                  'Parsing Figma layer tree',
                  'Extracting components and styles',
                  'Mapping to bullet-proof email blocks',
                  optimizeLabel,
                  'Finalizing HTML',
                ];
              })().map((label, i) => {
                const state = renderStage > i ? 'done' : renderStage === i ? 'active' : 'pending';
                return (
                  <li key={i} className={`render-stage render-stage-${state}`}>
                    <span className="render-stage-mark">
                      {state === 'done' ? '✓' : state === 'active' ? '' : '○'}
                    </span>
                    <span className="render-stage-num">[{String(i + 1).padStart(2, '0')}/05]</span>
                    <span className="render-stage-label">{label}</span>
                  </li>
                );
              })}
            </ul>
            <div className="render-progress">
              <div className="render-progress-fill" style={{ width: `${(renderStage / 5) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(0, 0, 0, 0.6)',
        fontWeight: 500
      }}>
        Created by{' '}
        <a
          href="https://www.davidz-losangeles.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2d601d', textDecoration: 'none', fontWeight: 600 }}
        >
          David Z.
        </a>
      </footer>
    </div>
  );
}

export default WebApp;

