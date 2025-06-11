import React from 'react';

interface ContactsSummaryProps {
  contacts: any[];
}

export const ContactsSummary: React.FC<ContactsSummaryProps> = ({ contacts }) => {
  const totalContacts = contacts.length;
  const roles = contacts.reduce((acc, contact) => {
    const role = contact.assignedRole || contact.role || contact.type || 'Unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">📋 Contacts Overview</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Contacts:</span>
          <span className="text-2xl font-bold text-blue-600">{totalContacts}</span>
        </div>
        
        {Object.keys(roles).length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">By Role:</h4>
            <div className="space-y-1">
              {Object.entries(roles)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([role, count]) => (
                  <div key={role} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{role}:</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        <div className="pt-3 border-t">
          <button className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Contacts →
          </button>
        </div>
      </div>
    </div>
  );
}; 