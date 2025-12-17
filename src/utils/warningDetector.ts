interface NodeData {
  id: string;
  name: string;
  type: string;
  layoutMode?: string;
  fills?: Array<{
    type: string;
    visible: boolean;
  }>;
  children?: NodeData[];
  fontFamily?: string;
  x?: number;
  y?: number;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

export function detectWarnings(nodeData: NodeData): Warning[] {
  const warnings: Warning[] = [];
  
  function traverse(node: NodeData, parentX: number = 0, parentY: number = 0) {
    // Check for non-auto-layout frames
    if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
        (!node.layoutMode || node.layoutMode === 'NONE')) {
      warnings.push({
        type: 'warning',
        message: `Frame "${node.name}" doesn't use auto-layout. Only auto-layout frames are fully supported for email conversion.`,
        nodeId: node.id,
      });
    }
    
    // Check for absolute positioning (if x/y don't match parent)
    if (node.x !== undefined && node.y !== undefined) {
      const absX = node.x - parentX;
      const absY = node.y - parentY;
      if (absX !== 0 || absY !== 0) {
        warnings.push({
          type: 'warning',
          message: `Element "${node.name}" uses absolute positioning which may not translate correctly to email HTML.`,
          nodeId: node.id,
        });
      }
    }
    
    // Check for unsupported fonts
    if (node.type === 'TEXT' && node.fontFamily) {
      const safeFonts = ['Arial', 'Helvetica', 'Helvetica Neue', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
      if (!safeFonts.some(safe => node.fontFamily!.toLowerCase().includes(safe.toLowerCase()))) {
        warnings.push({
          type: 'info',
          message: `Text uses "${node.fontFamily}" font. This will fallback to a safe font stack in email clients.`,
          nodeId: node.id,
        });
      }
    }
    
    // Check for image fills (background images)
    if (node.fills && node.fills.some(fill => fill.type === 'IMAGE' && fill.visible)) {
      warnings.push({
        type: 'warning',
        message: `Element "${node.name}" uses image fills. Background images may not display in all email clients.`,
        nodeId: node.id,
      });
    }
    
    // Check for gradients
    if (node.fills && node.fills.some(fill => fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL')) {
      warnings.push({
        type: 'warning',
        message: `Element "${node.name}" uses gradient fills. Gradients have limited support in email clients.`,
        nodeId: node.id,
      });
    }
    
    // Recursively check children
    if (node.children) {
      node.children.forEach(child => {
        traverse(child, node.x || 0, node.y || 0);
      });
    }
  }
  
  traverse(nodeData);
  
  return warnings;
}

