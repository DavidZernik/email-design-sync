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
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }
  
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.err || 'Failed to fetch file' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/figma/files/:fileKey/nodes', async (req, res) => {
  // Get node data from Figma file
  const { fileKey } = req.params;
  const { nodeIds, accessToken } = req.body;
  
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`, {
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

