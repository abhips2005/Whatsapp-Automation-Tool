import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api';
import { DynamicFilterOption } from '../../types';
import TemplateSelector from '../TemplateSelector';
import { MessagePreview } from '../MessagePreview';
import FileUpload from '../FileUpload';

interface BroadcastModalProps {
  onClose: () => void;
  onSend: (campaignData: { message: string; campaignName: string; filters?: any; file?: File | null }) => void;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ onClose, onSend, attachedFile, setAttachedFile }) => {
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<DynamicFilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewCount, setPreviewCount] = useState(0);
  const [sampleContact, setSampleContact] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<{ preview: string; missingVars: string[] }>({ preview: '', missingVars: [] });

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
        
        // First check if contacts are available
        const contactsSummary = await ApiService.getContactsSummary();
        
        if (!contactsSummary.success || contactsSummary.stats?.total === 0) {
          setFilterOptions([]);
          setPreviewCount(0);
          return;
        }

        // Fetch filter options from the new endpoint
        const filterResponse = await ApiService.getFilterOptions();
        
        if (!filterResponse.success || !filterResponse.options) {
          setFilterOptions([]);
          setPreviewCount(contactsSummary.stats?.total || 0);
          return;
        }

        // Build dynamic filter options based on backend response
        const dynamicOptions: DynamicFilterOption[] = [];
        
        // Prioritize common fields
        const priorityFields = ['role', 'assignedRole', 'year', 'branch', 'project', 'type'];
        const processedFields = new Set<string>();
        
        // Add priority fields first
        priorityFields.forEach(field => {
          if (filterResponse.options[field] && filterResponse.options[field].length > 0) {
            dynamicOptions.push({
              field: field,
              label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
              options: filterResponse.options[field]
            });
            processedFields.add(field);
          }
        });
        
        // Add other fields
        Object.entries(filterResponse.options).forEach(([field, values]) => {
          if (!processedFields.has(field) && Array.isArray(values) && values.length > 0 && values.length <= 50) {
            // Skip internal fields
            if (!['_id', 'email', 'phone', 'name'].includes(field)) {
              dynamicOptions.push({
                field: field,
                label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
                options: values
              });
            }
          }
        });

        setFilterOptions(dynamicOptions);
        setPreviewCount(filterResponse.totalContacts || 0);
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        console.error('Error details:', error);
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
        console.log('Preview count response:', contactsResponse);
        setPreviewCount(contactsResponse.total || contactsResponse.totalContacts || contactsResponse.data?.length || 0);
      } catch (error) {
        console.error('Failed to update preview count:', error);
        console.error('Error details:', error);
        setPreviewCount(0);
      }
    };

    updatePreviewCount(); // Always update, even with no filters
  }, [filters]);

  // Fetch a sample contact whenever filters change
  useEffect(() => {
    const fetchSampleContact = async () => {
      try {
        const contactsResponse = await ApiService.getContacts(filters);
        const contacts = contactsResponse.data || [];
        setSampleContact(contacts[0] || null);
      } catch (error) {
        setSampleContact(null);
      }
    };
    fetchSampleContact();
  }, [filters]);

  // Update preview whenever message or sampleContact changes
  useEffect(() => {
    const updatePreview = async () => {
      if (!sampleContact) {
        setPreviewData({ preview: '', missingVars: [] });
        return;
      }
      try {
        const data = await ApiService.getMessagePreview(message, sampleContact);
        setPreviewData(data);
      } catch (error) {
        setPreviewData({ preview: '', missingVars: [] });
      }
    };
    updatePreview();
  }, [message, sampleContact]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to determine file type
  const getFileType = (file: File): 'image' | 'document' => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(ext) ? 'image' : 'document';
  };

  const handleSend = async () => {
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

    try {
      // Determine how to send based on file type
      if (attachedFile) {
        const fileType = getFileType(attachedFile);
        
        if (fileType === 'image') {
          // Send as image broadcast (existing functionality)
          const result = await ApiService.startBroadcastWithImage({
            message: message.trim(),
            campaignName: campaignName.trim(),
            filters: Object.keys(filters).length > 0 ? filters : undefined,
            image: attachedFile
          });
          alert(`Campaign started! Broadcasting image to ${result.targets} contacts.`);
        } else {
          // Send as document broadcast 
          const documentResult = await ApiService.uploadDocument(attachedFile);
          if (!documentResult.success) {
            alert('Document upload failed. Please try again.');
            return;
          }
          
          // Send text message first (documents are sent separately)
          await onSend({
            message: message.trim(),
            campaignName: campaignName.trim(),
            filters: Object.keys(filters).length > 0 ? filters : undefined
          });
          
          alert(`Campaign started! Broadcasting message and document to ${previewCount} contacts.`);
        }
      } else {
        // Send text-only broadcast
        onSend({
          message: message.trim(),
          campaignName: campaignName.trim(),
          filters: Object.keys(filters).length > 0 ? filters : undefined
        });
        alert(`Campaign started! Broadcasting to ${previewCount} contacts.`);
      }
    } catch (error) {
      console.error('Broadcast failed:', error);
      alert('Failed to start broadcast. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">📤 Send Broadcast</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              {/* You can add an "X" icon here for close */}
              ×
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
                  onClick={() => alert('Template editor coming soon!')}
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

            {/* File Upload - Images and Documents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach File (optional)
              </label>
              <FileUpload onFileChange={setAttachedFile} selectedFile={attachedFile} />
              {attachedFile && (
                <div className="mt-2 text-xs text-gray-600">
                  {getFileType(attachedFile) === 'image' ? (
                    <span className="text-green-600">🖼️ Image will be sent with your message as caption</span>
                  ) : (
                    <span className="text-blue-600">📎 Document will be sent along with your message</span>
                  )}
                </div>
              )}
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

        {/* Message Preview */}
        {sampleContact && message.trim() && (
          <div className="px-6 pb-2">
            <MessagePreview preview={previewData.preview} missingVars={previewData.missingVars} />
          </div>
        )}

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
    </div>
  );
}