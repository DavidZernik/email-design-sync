interface NodeData {
  id: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  layoutMode?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  fills?: Array<{
    type: string;
    visible: boolean;
    color: string | null;
  }>;
  children?: NodeData[];
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  imageHash?: string;
}

interface ExportOptions {
  maxWidth: number;
  minify: boolean;
  targetClients: string[];
}

export function generateEmailHTML(nodeData: NodeData, options: ExportOptions): string {
  const { maxWidth, minify } = options;
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse; border-spacing: 0; margin: 0;}
    div, td {padding: 0;}
    div {margin: 0 !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${maxWidth}" style="max-width: ${maxWidth}px; width: 100%;">
`;

  html += convertNodeToHTML(nodeData, options);

  html += `        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  if (minify) {
    html = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  }

  return html;
}

function convertNodeToHTML(node: NodeData, options: ExportOptions, depth: number = 0): string {
  const indent = '          ' + '  '.repeat(depth);
  
  // Handle text nodes
  if (node.type === 'TEXT' && node.characters) {
    const styles: string[] = [];
    
    if (node.fontSize) {
      styles.push(`font-size: ${Math.round(node.fontSize)}px`);
    }
    if (node.fontFamily) {
      styles.push(`font-family: ${getEmailSafeFontStack(node.fontFamily)}`);
    }
    if (node.fontWeight && node.fontWeight !== 'Regular') {
      const weight = normalizeFontWeight(node.fontWeight);
      styles.push(`font-weight: ${weight}`);
    }
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills.find(f => f.visible && f.color);
      if (fill && fill.color) {
        styles.push(`color: ${fill.color}`);
      }
    }
    
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    return `${indent}<div${styleAttr}>${escapeHTML(node.characters)}</div>\n`;
  }
  
  // Handle frames/components with auto-layout
  if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
      node.layoutMode && node.layoutMode !== 'NONE') {
    
    // Check if this looks like a button (frame with background and text inside)
    if (detectButton(node)) {
      return convertToBulletproofButton(node, options, depth);
    }
    
    const isHorizontal = node.layoutMode === 'HORIZONTAL';
    const styles: string[] = [];
    
    // Background color
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills.find(f => f.visible && f.color);
      if (fill && fill.color) {
        styles.push(`background-color: ${fill.color}`);
      }
    }
    
    // Padding
    const padding = [];
    if (node.paddingTop) padding.push(`${Math.round(node.paddingTop)}px`);
    if (node.paddingRight) padding.push(`${Math.round(node.paddingRight)}px`);
    if (node.paddingBottom) padding.push(`${Math.round(node.paddingBottom)}px`);
    if (node.paddingLeft) padding.push(`${Math.round(node.paddingLeft)}px`);
    
    if (padding.length === 4) {
      styles.push(`padding: ${padding.join(' ')}`);
    } else if (padding.length > 0) {
      // Apply individual paddings if not all are present
      if (node.paddingTop) styles.push(`padding-top: ${Math.round(node.paddingTop)}px`);
      if (node.paddingRight) styles.push(`padding-right: ${Math.round(node.paddingRight)}px`);
      if (node.paddingBottom) styles.push(`padding-bottom: ${Math.round(node.paddingBottom)}px`);
      if (node.paddingLeft) styles.push(`padding-left: ${Math.round(node.paddingLeft)}px`);
    }
    
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    
    let html = '';
    
    // For horizontal layouts, use table row
    if (isHorizontal) {
      html += `${indent}<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"${styleAttr}>\n`;
      html += `${indent}  <tr>\n`;
      
      if (node.children) {
        node.children.forEach((child, index) => {
          html += `${indent}    <td style="vertical-align: top;${node.itemSpacing && index > 0 ? ` padding-left: ${Math.round(node.itemSpacing)}px;` : ''}">\n`;
          html += convertNodeToHTML(child, options, depth + 2);
          html += `${indent}    </td>\n`;
        });
      }
      
      html += `${indent}  </tr>\n`;
      html += `${indent}</table>\n`;
    } else {
      // For vertical layouts, use nested table cells
      html += `${indent}<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"${styleAttr}>\n`;
      
      if (node.children) {
        node.children.forEach((child, index) => {
          html += `${indent}  <tr>\n`;
          html += `${indent}    <td style="vertical-align: top;${node.itemSpacing && index > 0 ? ` padding-top: ${Math.round(node.itemSpacing)}px;` : ''}">\n`;
          html += convertNodeToHTML(child, options, depth + 2);
          html += `${indent}    </td>\n`;
          html += `${indent}  </tr>\n`;
        });
      }
      
      html += `${indent}</table>\n`;
    }
    
    return html;
  }
  
  // Handle regular frames/components (non-auto-layout)
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const styles: string[] = [];
    
    if (node.width) {
      styles.push(`width: ${Math.round(node.width)}px`);
    }
    if (node.height) {
      styles.push(`height: ${Math.round(node.height)}px`);
    }
    
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills.find(f => f.visible && f.color);
      if (fill && fill.color) {
        styles.push(`background-color: ${fill.color}`);
      }
    }
    
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    
    let html = `${indent}<div${styleAttr}>\n`;
    
    if (node.children) {
      node.children.forEach(child => {
        html += convertNodeToHTML(child, options, depth + 1);
      });
    }
    
    html += `${indent}</div>\n`;
    return html;
  }
  
  // Handle images
  if (node.type === 'IMAGE' && node.imageHash) {
    // Images will be extracted to ZIP, use placeholder path
    const imagePath = `images/${node.imageHash}.png`;
    const styles: string[] = [];
    
    if (node.width) styles.push(`width: ${Math.round(node.width)}px`);
    if (node.height) styles.push(`height: ${Math.round(node.height)}px`);
    styles.push('display: block');
    styles.push('border: 0');
    
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    return `${indent}<img src="${imagePath}" alt=""${styleAttr} />\n`;
  }
  
  // Handle rectangles/shapes
  if ((node.type === 'RECTANGLE' || node.type === 'ELLIPSE') && node.fills) {
    const fill = node.fills.find(f => f.visible && f.color);
    if (fill && fill.color) {
      const styles: string[] = [];
      
      if (node.width) styles.push(`width: ${Math.round(node.width)}px`);
      if (node.height) styles.push(`height: ${Math.round(node.height)}px`);
      styles.push(`background-color: ${fill.color}`);
      styles.push('display: block');
      
      const styleAttr = ` style="${styles.join('; ')}"`;
      return `${indent}<div${styleAttr}></div>\n`;
    }
  }
  
  // Default: render children if any
  if (node.children && node.children.length > 0) {
    let html = '';
    node.children.forEach(child => {
      html += convertNodeToHTML(child, options, depth);
    });
    return html;
  }
  
  return '';
}

function getEmailSafeFontStack(fontFamily: string): string {
  const fontMap: { [key: string]: string } = {
    'Helvetica Neue': 'Helvetica Neue, Helvetica, Arial, sans-serif',
    'Helvetica': 'Helvetica, Arial, sans-serif',
    'Arial': 'Arial, Helvetica, sans-serif',
    'Georgia': 'Georgia, serif',
    'Times New Roman': 'Times New Roman, Times, serif',
    'Courier New': 'Courier New, Courier, monospace',
  };
  
  return fontMap[fontFamily] || `${fontFamily}, Arial, Helvetica, sans-serif`;
}

function normalizeFontWeight(weight: string): string {
  const weightMap: { [key: string]: string } = {
    'Thin': '100',
    'Extra Light': '200',
    'Light': '300',
    'Regular': '400',
    'Medium': '500',
    'Semi Bold': '600',
    'Bold': '700',
    'Extra Bold': '800',
    'Black': '900',
  };
  
  return weightMap[weight] || weight.replace(/[^0-9]/g, '') || '400';
}

function detectButton(node: NodeData): boolean {
  // Check if node name suggests it's a button
  const name = node.name.toLowerCase();
  if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
    return true;
  }
  
  // Check if it's a frame with background and contains text
  if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
      node.fills && node.fills.some(f => f.visible && f.color) &&
      node.children) {
    const hasText = node.children.some(child => child.type === 'TEXT' && child.characters);
    if (hasText) {
      return true;
    }
  }
  
  return false;
}

function convertToBulletproofButton(node: NodeData, options: ExportOptions, depth: number): string {
  const indent = '          ' + '  '.repeat(depth);
  
  // Extract button text
  let buttonText = '';
  if (node.children) {
    const textChild = node.children.find(child => child.type === 'TEXT' && child.characters);
    if (textChild && textChild.characters) {
      buttonText = textChild.characters;
    }
  }
  
  if (!buttonText) {
    buttonText = 'Button';
  }
  
  // Get background color
  let bgColor = '#18a0fb'; // default blue
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills.find(f => f.visible && f.color);
    if (fill && fill.color) {
      bgColor = fill.color;
    }
  }
  
  // Get text color (from text child if available)
  let textColor = '#ffffff';
  if (node.children) {
    const textChild = node.children.find(child => child.type === 'TEXT');
    if (textChild && textChild.fills && textChild.fills.length > 0) {
      const fill = textChild.fills.find(f => f.visible && f.color);
      if (fill && fill.color) {
        textColor = fill.color;
      }
    }
  }
  
  // Get padding
  const paddingTop = node.paddingTop || 12;
  const paddingBottom = node.paddingBottom || 12;
  const paddingLeft = node.paddingLeft || 24;
  const paddingRight = node.paddingRight || 24;
  
  // Bulletproof button pattern
  return `${indent}<!--[if mso]>
${indent}<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="#" style="height:${Math.round(paddingTop + paddingBottom + 20)}px;v-text-anchor:middle;width:auto;" arcsize="0%" strokecolor="${bgColor}" fillcolor="${bgColor}">
${indent}<w:anchorlock/>
${indent}<center style="color:${textColor};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${escapeHTML(buttonText)}</center>
${indent}</v:roundrect>
${indent}<![endif]-->
${indent}<!--[if !mso]><!-->
${indent}<div style="display: inline-block; background-color: ${bgColor}; border-radius: 4px; padding: ${Math.round(paddingTop)}px ${Math.round(paddingRight)}px ${Math.round(paddingBottom)}px ${Math.round(paddingLeft)}px;">
${indent}  <a href="#" style="color: ${textColor}; text-decoration: none; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; display: inline-block;">${escapeHTML(buttonText)}</a>
${indent}</div>
${indent}<!--<![endif]-->
`;
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

