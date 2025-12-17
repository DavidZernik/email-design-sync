// This runs in the Figma plugin sandbox
figma.showUI(__html__, { 
  width: 400, 
  height: 600,
  themeColors: true
});

// Send initial selection to UI
function sendSelection() {
  const selection = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-change',
    selection: selection.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      isAutoLayout: 'layoutMode' in node && node.layoutMode !== 'NONE',
      width: 'width' in node ? node.width : 0,
      height: 'height' in node ? node.height : 0,
    }))
  });
}

sendSelection();

// Listen for selection changes
figma.on('selectionchange', () => {
  sendSelection();
});

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'export-email') {
    try {
      const nodeId = msg.nodeId;
      const node = figma.getNodeById(nodeId) as SceneNode;
      
      if (!node) {
        figma.ui.postMessage({
          type: 'export-error',
          error: 'Selected node not found'
        });
        return;
      }

      // Extract node data
      const nodeData = await extractNodeData(node);
      
      // Get images
      const images = await extractImages(node);
      
      figma.ui.postMessage({
        type: 'export-success',
        nodeData,
        images
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'export-error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  if (msg.type === 'close-plugin') {
    figma.closePlugin();
  }
};

// Extract node data recursively
async function extractNodeData(node: SceneNode): Promise<any> {
  const data: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // Handle different node types
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frame = node as FrameNode | ComponentNode | InstanceNode;
    data.width = frame.width;
    data.height = frame.height;
    
    // Auto-layout properties
    if ('layoutMode' in frame && frame.layoutMode !== 'NONE') {
      data.layoutMode = frame.layoutMode;
      data.paddingLeft = frame.paddingLeft;
      data.paddingRight = frame.paddingRight;
      data.paddingTop = frame.paddingTop;
      data.paddingBottom = frame.paddingBottom;
      data.itemSpacing = frame.itemSpacing;
      if ('primaryAxisAlignItems' in frame) {
        data.primaryAxisAlignItems = frame.primaryAxisAlignItems;
      }
      if ('counterAxisAlignItems' in frame) {
        data.counterAxisAlignItems = frame.counterAxisAlignItems;
      }
    }
    
    // Background fills
    if ('fills' in frame && Array.isArray(frame.fills)) {
      data.fills = frame.fills.map(fill => ({
        type: fill.type,
        visible: fill.visible,
        opacity: fill.opacity,
        color: fill.type === 'SOLID' ? rgbToHex(fill.color, fill.opacity || 1) : null,
      }));
    }
    
    // Extract children
    if ('children' in frame) {
      data.children = [];
      for (const child of frame.children) {
        data.children.push(await extractNodeData(child));
      }
    }
  }
  
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    data.characters = textNode.characters;
    data.fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 16;
    data.fontFamily = typeof textNode.fontName === 'object' && textNode.fontName ? textNode.fontName.family : 'Arial';
    data.fontWeight = typeof textNode.fontName === 'object' && textNode.fontName ? textNode.fontName.style : 'Regular';
    
    // Text fills
    if ('fills' in textNode && Array.isArray(textNode.fills)) {
      data.fills = textNode.fills.map(fill => ({
        type: fill.type,
        visible: fill.visible,
        opacity: fill.opacity,
        color: fill.type === 'SOLID' ? rgbToHex(fill.color, fill.opacity || 1) : null,
      }));
    }
    
    data.width = textNode.width;
    data.height = textNode.height;
    data.x = 'x' in node ? node.x : 0;
    data.y = 'y' in node ? node.y : 0;
  }
  
  if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR') {
    const shape = node as RectangleNode | EllipseNode | VectorNode;
    data.width = shape.width;
    data.height = shape.height;
    data.x = 'x' in shape ? shape.x : 0;
    data.y = 'y' in shape ? shape.y : 0;
    
    if ('fills' in shape && Array.isArray(shape.fills)) {
      data.fills = shape.fills.map(fill => ({
        type: fill.type,
        visible: fill.visible,
        opacity: fill.opacity,
        color: fill.type === 'SOLID' ? rgbToHex(fill.color, fill.opacity || 1) : null,
      }));
    }
  }
  
  if (node.type === 'IMAGE') {
    const imageNode = node as ImageNode;
    data.width = imageNode.width;
    data.height = imageNode.height;
    data.x = 'x' in imageNode ? imageNode.x : 0;
    data.y = 'y' in imageNode ? imageNode.y : 0;
    
    if ('imageHash' in imageNode && imageNode.imageHash) {
      data.imageHash = imageNode.imageHash;
    }
  }

  // Position info
  if ('x' in node) data.x = node.x;
  if ('y' in node) data.y = node.y;

  return data;
}

// Extract images from node tree
async function extractImages(node: SceneNode): Promise<Array<{hash: string, name: string, bytes: Uint8Array}>> {
  const images: Array<{hash: string, name: string, bytes: Uint8Array}> = [];
  
  async function traverse(n: SceneNode) {
    if (n.type === 'IMAGE' && 'imageHash' in n && n.imageHash) {
      try {
        const image = figma.getImageByHash(n.imageHash);
        const bytes = await image.getBytesAsync();
        images.push({
          hash: n.imageHash,
          name: `${n.id}.png`,
          bytes
        });
      } catch (error) {
        console.error('Error extracting image:', error);
      }
    }
    
    if ('children' in n) {
      for (const child of n.children) {
        await traverse(child);
      }
    }
    
    // Note: Image fills (background images) require additional API calls
    // and are more complex. For now, we focus on IMAGE node types.
  }
  
  await traverse(node);
  return images;
}

// Convert RGB to hex
function rgbToHex(color: RGB, opacity: number = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  
  if (opacity < 1) {
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

