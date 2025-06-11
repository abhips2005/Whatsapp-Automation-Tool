import React, { useState } from 'react';
import { CSVAnalysisResult } from '../../types';

interface FieldMappingModalProps {
  csvAnalysis: CSVAnalysisResult;
  onClose: () => void;
  onSubmit: (mapping: Record<string, string>) => void;
}

export const FieldMappingModal: React.FC<FieldMappingModalProps> = ({ 
  csvAnalysis, 
  onClose, 
  onSubmit 
}) => {
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetField]: sourceColumn
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !fieldMapping[field] || fieldMapping[field] === 'null');
    
    if (missingFields.length > 0) {
      alert(`Please map the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    onSubmit(fieldMapping);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Map CSV Fields</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Map your CSV columns to the required fields. Preview shows first 5 rows.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field Mapping */}
            <div>
              <h3 className="font-semibold mb-4">Field Mapping</h3>
              <div className="space-y-4">
                {Object.entries(csvAnalysis.expectedFields).map(([field, config]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field} {config.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={fieldMapping[field] || ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                    >
                      <option value="">Select column...</option>
                      {csvAnalysis.availableColumns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Preview */}
            <div>
              <h3 className="font-semibold mb-4">Data Preview</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvAnalysis.availableColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left font-medium text-gray-700">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvAnalysis.sampleData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {csvAnalysis.availableColumns.map((column) => (
                            <td key={column} className="px-3 py-2 text-gray-900">
                              {String(row[column] || '').substring(0, 50)}
                              {String(row[column] || '').length > 50 && '...'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Total rows:</strong> {csvAnalysis.totalRows}</p>
                <p><strong>Columns found:</strong> {csvAnalysis.availableColumns.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Process CSV
          </button>
        </div>
      </div>
    </div>
  );
}; 