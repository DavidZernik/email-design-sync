import React, { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface Props {
  html: string;
  onCopy: () => void;
  onDownload: () => void;
}

const CodePreview: React.FC<Props> = ({ html, onCopy, onDownload }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      iframeRef.current.contentDocument.open();
      iframeRef.current.contentDocument.write(html);
      iframeRef.current.contentDocument.close();
    }
  }, [html]);

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <div className="panel-title">Generated HTML</div>
        <div className="code-preview-tabs">
          <button
            className={`code-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button
            className={`code-tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            Code
          </button>
        </div>
        <div className="code-preview-actions">
          <button id="copy-button" className="code-button" onClick={onCopy}>
            Copy
          </button>
          <button className="code-button secondary" onClick={onDownload}>
            Download ZIP
          </button>
        </div>
      </div>
      {activeTab === 'code' ? (
        <div className="code-container">
          <SyntaxHighlighter
            language="html"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: 0,
              background: 'transparent',
              fontSize: '10px',
            }}
          >
            {html}
          </SyntaxHighlighter>
        </div>
      ) : (
        <div className="preview-container">
          <iframe
            ref={iframeRef}
            title="Email Preview"
            className="preview-iframe"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
};

export default CodePreview;

