import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api';
import { DynamicFilterOption } from '../../types';
import TemplateSelector from '../TemplateSelector';
import TemplateEditor from '../TemplateEditor';

interface BroadcastModalProps {
  onClose: () => void;
  onSend: (campaignData: { message: string; campaignName: string; filters?: any }) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ onClose, onSend }) => {
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<DynamicFilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewCount, setPreviewCount] = useState(0);

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  // Define MessageTemplate type (adjust fields as needed)
  type MessageTemplate = {
    _id: string;
    name: string;
    content: string;
  };
  
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setIsLoading(true);
        
        // Fetch contacts to build dynamic filter options
        const contactsResponse = await ApiService.getContacts();
        const contacts = contactsResponse.data;
        
        if (!contacts || contacts.length === 0) {
          setFilterOptions([]);
          setPreviewCount(0);
          return;
        }

        // Build dynamic filter options based on available data
        const dynamicOptions: DynamicFilterOption[] = [];
        
        // Get all unique keys from contacts
        const allKeys = new Set<string>();
        contacts.forEach(contact => {
          Object.keys(contact).forEach(key => allKeys.add(key));
        });
        
        // Build filter options for each field
        allKeys.forEach(key => {
          const uniqueValues = Array.from(new Set(
            contacts
              .map(contact => contact[key])
              .filter(value => value && String(value).trim() !== '')
              .map(value => String(value).trim())
          )).sort();
          
          if (uniqueValues.length > 0 && uniqueValues.length <= 50) { // Limit options to prevent UI issues
            dynamicOptions.push({
              field: key,
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
              options: uniqueValues
            });
          }
        });

        setFilterOptions(dynamicOptions);
        setPreviewCount(contacts.length); // All contacts by default
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        setFilterOptions([]);
        setPreviewCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
  const fetchTemplates = async () => {
    try {
      const response = await ApiService.getMessageTemplates();
      if (Array.isArray(response)) {
        setTemplates(response);
      } else {
        console.warn("Expected array, got:", response);
        setTemplates([]);
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
      setTemplates([]);
    }
  };

  fetchTemplates();
}, []);


  // Update preview count when filters change
  useEffect(() => {
    const updatePreviewCount = async () => {
      try {
        const contactsResponse = await ApiService.getContacts(filters);
        setPreviewCount(contactsResponse.total || contactsResponse.data?.length || 0);
      } catch (error) {
        console.error('Failed to update preview count:', error);
        setPreviewCount(0);
      }
    };

    if (Object.keys(filters).length > 0) {
      updatePreviewCount();
    }
  }, [filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSend = () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }
    
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    if (previewCount === 0) {
      alert('No contacts match your filters');
      return;
    }

    onSend({
      message: message.trim(),
      campaignName: campaignName.trim(),
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">📤 Send Broadcast</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter campaign name..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
               Use a Message Template
              </label>
              <div className="space-y-2">
              <TemplateSelector
                 templates={templates}
                 onTemplateSelect={(content: string) => setMessage(content)}
              />
              <button
                onClick={() => setShowTemplateEditor(true)}
                className="text-sm text-blue-600 underline hover:text-blue-800"
             >
               + Create New Template
              </button>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 h-32 resize-none"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="text-sm text-gray-500 mt-1">
                Characters: {message.length}
              </div>
            </div>

            {/* Filters */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🎯 Target Audience</h3>
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading filter options...</p>
                </div>
              ) : filterOptions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No contacts available for filtering.</p>
                  <p className="text-sm mt-1">Please upload contacts first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filterOptions.map((option) => (
                      <div key={option.field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {option.label}
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          value={filters[option.field] || ''}
                          onChange={(e) => handleFilterChange(option.field, e.target.value)}
                        >
                          <option value="">All {option.label.toLowerCase()}</option>
                          {option.options.map((value: string) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  
                  {/* Preview */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 font-medium">
                        📊 Preview: {previewCount} contacts will receive this message
                      </span>
                      {Object.keys(filters).length > 0 && (
                        <button
                          onClick={() => setFilters({})}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                    
                    {Object.keys(filters).length > 0 && (
                      <div className="mt-2 text-sm text-blue-700">
                        <strong>Active filters:</strong> {
                          Object.entries(filters)
                            .filter(([, value]) => value)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || !campaignName.trim() || previewCount === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send to {previewCount} contacts
          </button>
        </div>
      </div>
      {showTemplateEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <TemplateEditor
            onSave={async () => {
              setShowTemplateEditor(false);
              const updated = await ApiService.getMessageTemplates();
              setTemplates(updated);
              if (updated?.length) {
                setMessage(updated[updated.length - 1].content);
              }
            }}
            onCancel={() => setShowTemplateEditor(false)}
          />
        </div>
      )}
    </div>
  );
};