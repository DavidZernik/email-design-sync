const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Email Design Sync API is running' });
});

// Verify Figma token
app.get('/api/figma/verify-token', async (req, res) => {
  const { accessToken } = req.query;
  
  console.log('[Server] GET /api/figma/verify-token');
  console.log('[Server] Access Token (first 10 chars):', accessToken ? accessToken.substring(0, 10) + '...' : 'missing');
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }
  
  try {
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'X-Figma-Token': accessToken
      }
    });
    
    console.log('[Server] Figma /me response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Server] Token verification failed:', errorData);
      return res.status(response.status).json({ 
        valid: false, 
        error: response.status === 401 ? 'Invalid or expired token' : 'Token verification failed'
      });
    }
    
    const userData = await response.json();
    console.log('[Server] Token is valid for user:', userData.email || userData.handle);
    res.json({ 
      valid: true, 
      user: {
        id: userData.id,
        email: userData.email,
        handle: userData.handle,
        img_url: userData.img_url
      }
    });
  } catch (error) {
    console.error('[Server] Error verifying token:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

// Figma API proxy endpoints
app.post('/api/figma/auth', async (req, res) => {
  // Handle Figma OAuth - you'll need to implement this with your Figma app credentials
  const { code } = req.body;
  // TODO: Exchange code for access token
  res.json({ message: 'Figma authentication endpoint - implement OAuth flow' });
});

app.get('/api/figma/files/:fileKey', async (req, res) => {
  // Get file data from Figma
  const { fileKey } = req.params;
  const { accessToken } = req.query;
  
  console.log('[Server] GET /api/figma/files/:fileKey');
  console.log('[Server] File Key:', fileKey);
  console.log('[Server] Access Token (first 10 chars):', accessToken ? accessToken.substring(0, 10) + '...' : 'missing');
  
  if (!accessToken) {
    console.error('[Server] Missing access token');
    return res.status(400).json({ error: 'Access token required' });
  }
  
  try {
    const figmaUrl = `https://api.figma.com/v1/files/${fileKey}`;
    console.log('[Server] Fetching from Figma API:', figmaUrl);
    
    const response = await fetch(figmaUrl, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });
    
    console.log('[Server] Figma API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ err: 'Unknown error' }));
      console.error('[Server] Figma API error:', errorData);
      console.error('[Server] Full error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      let errorMessage = 'Failed to fetch file';
      if (response.status === 404) {
        errorMessage = 'File not found. Check: (1) File key is correct from Figma URL, (2) Token has permission, (3) File exists';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Your token may not have permission to access this file.';
      } else if (response.status === 401) {
        errorMessage = 'Invalid access token. Please check your Figma access token.';
      } else {
        errorMessage = errorData.err || `Failed to fetch file (${response.status})`;
      }
      
      return res.status(response.status).json({ error: errorMessage, details: errorData });
    }
    
    const data = await response.json();
    console.log('[Server] Successfully fetched file data');
    console.log('[Server] Response has document?', !!data.document);
    res.json(data);
  } catch (error) {
    console.error('[Server] Error in /api/figma/files/:fileKey:', error);
    console.error('[Server] Error message:', error.message);
    console.error('[Server] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/figma/files/:fileKey/nodes', async (req, res) => {
  // Get node data from Figma file
  const { fileKey } = req.params;
  const { nodeIds, accessToken } = req.body;
  
  console.log('[Server] POST /api/figma/files/:fileKey/nodes');
  console.log('[Server] File Key:', fileKey);
  console.log('[Server] Node IDs:', nodeIds);
  console.log('[Server] Access Token (first 10 chars):', accessToken ? accessToken.substring(0, 10) + '...' : 'missing');
  
  try {
    const nodeIdsParam = nodeIds.join(',');
    const figmaUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIdsParam}`;
    console.log('[Server] Fetching nodes from Figma API:', figmaUrl);
    
    const response = await fetch(figmaUrl, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });
    
    console.log('[Server] Figma API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Server] Figma API error:', errorData);
      return res.status(response.status).json({ error: errorData.err || 'Failed to fetch nodes' });
    }
    
    const data = await response.json();
    console.log('[Server] Successfully fetched node data');
    console.log('[Server] Response nodes:', Object.keys(data.nodes || {}));
    res.json(data);
  } catch (error) {
    console.error('[Server] Error in /api/figma/files/:fileKey/nodes:', error);
    console.error('[Server] Error message:', error.message);
    console.error('[Server] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/files/:fileKey/images', async (req, res) => {
  // Get images from Figma file
  const { fileKey } = req.params;
  const { accessToken, ids } = req.query;
  
  try {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;
    const response = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}`, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main HTML page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Email Design Sync web server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure to set FIGMA_ACCESS_TOKEN in .env file for API access`);
});

