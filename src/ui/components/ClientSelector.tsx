import React from 'react';

interface Props {
  selectedClients: string[];
  onChange: (clients: string[]) => void;
}

const EMAIL_CLIENTS = [
  { id: 'gmail', label: 'Gmail' },
  { id: 'apple-mail', label: 'Apple Mail' },
  { id: 'yahoo', label: 'Yahoo Mail' },
  { id: 'outlook-web', label: 'Outlook.com (Web)' },
  { id: 'gmail-mobile', label: 'Gmail (Mobile)' },
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
      <div className="panel-title">Target Email Clients</div>
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

