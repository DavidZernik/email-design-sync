import React from 'react';

interface Props {
  selectedClients: string[];
  onChange: (clients: string[]) => void;
}

export const EMAIL_CLIENTS = [
  { id: 'gmail', label: 'Gmail (Web)' },
  { id: 'gmail-mobile', label: 'Gmail (Mobile)' },
  { id: 'apple-mail', label: 'Apple Mail (macOS)' },
  { id: 'apple-mail-ios', label: 'Apple Mail (iPhone)' },
  { id: 'outlook-windows', label: 'Outlook (Windows)' },
  { id: 'outlook-web', label: 'Outlook.com (Web)' },
  { id: 'outlook-mobile', label: 'Outlook (Mobile)' },
  { id: 'yahoo', label: 'Yahoo Mail' },
  { id: 'protonmail', label: 'ProtonMail' },
  { id: 'aol', label: 'AOL Mail' },
];

const ClientSelector: React.FC<Props> = ({ selectedClients, onChange }) => {
  const handleToggle = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      onChange(selectedClients.filter(id => id !== clientId));
    } else {
      onChange([...selectedClients, clientId]);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">Priority Email Clients</div>
      <p style={{ fontSize: '13px', color: 'rgba(0, 0, 0, 0.7)', marginBottom: '14px', lineHeight: 1.5 }}>
        The output always renders on every major client. Pick the ones that matter most to you and we'll do an extra render-check pass on those.
      </p>
      <div className="checklist">
        {EMAIL_CLIENTS.map(client => (
          <div key={client.id} className="checkbox-item">
            <input
              type="checkbox"
              id={client.id}
              checked={selectedClients.includes(client.id)}
              onChange={() => handleToggle(client.id)}
            />
            <label htmlFor={client.id}>{client.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientSelector;

