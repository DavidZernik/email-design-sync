import React from 'react';

interface Props {
  onSelectTemplate: (templateId: string) => void;
}

const TEMPLATES = [
  {
    id: 'newsletter-basic',
    name: 'Basic Newsletter',
    description: 'Simple two-column layout',
  },
  {
    id: 'promotional',
    name: 'Promotional Email',
    description: 'Hero image with CTA button',
  },
  {
    id: 'transactional',
    name: 'Transactional',
    description: 'Clean, single-column layout',
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Product grid layout',
  },
];

const TemplateLibrary: React.FC<Props> = ({ onSelectTemplate }) => {
  const handleTemplateSelect = (templateId: string) => {
    // For now, just show a message - in a real implementation,
    // this would create the template in Figma
    alert(`Template "${templateId}" selected. In a full implementation, this would create the template structure in your Figma file.`);
    // onSelectTemplate(templateId);
  };

  return (
    <div className="panel">
      <div className="panel-title">Email Templates</div>
      <div className="template-grid">
        {TEMPLATES.map(template => (
          <div
            key={template.id}
            className="template-card"
            onClick={() => handleTemplateSelect(template.id)}
          >
            <div className="template-card-name">{template.name}</div>
            <div className="template-card-desc">{template.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateLibrary;

