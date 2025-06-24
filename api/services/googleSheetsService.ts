import fetch from 'node-fetch';
import csv from 'csvtojson';

export class GoogleSheetsService {
  /**
   * Extract sheet ID from Google Sheets URL
   */
  static extractSheetId(url: string): string | null {
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/ // Direct sheet ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1]; // ✅ Fixed: Added match[1] check
    }
    
    return null;
  }

  /**
   * Fetch Google Sheets as CSV content
   */
  static async fetchAsCSV(sheetUrl: string, apiKey?: string): Promise<string> {
    try {
      console.log('🔍 Extracting sheet ID from URL:', sheetUrl);
      
      const sheetId = this.extractSheetId(sheetUrl);
      if (!sheetId) {
        throw new Error('Invalid Google Sheets URL format');
      }

      console.log('📋 Sheet ID extracted:', sheetId);

      let csvContent: string;
      
      if (apiKey) {
        console.log('🔑 Using API key method');
        // Use Google Sheets API and convert to CSV
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z?key=${apiKey}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.error('❌ API request failed:', response.status, response.statusText);
          if (response.status === 403) {
            throw new Error('Invalid API key or insufficient permissions');
          } else if (response.status === 404) {
            throw new Error('Sheet not found or not accessible');
          }
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        csvContent = this.convertApiResponseToCSV(data);
        
      } else {
        console.log('🌐 Using public CSV export method');
        // Use direct CSV export (public sheets only)
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        console.log('🔗 CSV URL:', csvUrl);
        
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
          console.error('❌ CSV export failed:', response.status, response.statusText);
          if (response.status === 403) {
            throw new Error('Sheet is private. Please make it public: Share → Anyone with the link can view');
          }
          throw new Error(`Failed to access sheet: ${response.statusText}`);
        }
        
        csvContent = await response.text();
      }
      
      console.log('✅ CSV content received, length:', csvContent.length);
      console.log('📄 First 200 characters:', csvContent.substring(0, 200));
      
      if (!csvContent.trim()) {
        throw new Error('Sheet appears to be empty');
      }
      
      return csvContent;
      
    } catch (error) {
      console.error('❌ Google Sheets fetch error:', error);
      throw error;
    }
  }

  /**
   * Convert API response to CSV format
   */
  static convertApiResponseToCSV(data: any): string {
    if (!data.values || data.values.length === 0) {
      throw new Error('Sheet is empty or contains no data');
    }

    const rows = data.values;
    
    // Convert each row to CSV format
    const csvRows = rows.map((row: any[]) => {
      return row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        const cellValue = String(cell || '');
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(',');
    });

    return csvRows.join('\n');
  }

  /**
   * Validate sheet access
   */
  static async validateSheetAccess(sheetUrl: string, apiKey?: string): Promise<{valid: boolean, error?: string, message?: string}> {
    try {
      console.log('🧪 Validating sheet access for:', sheetUrl);
      
      const sheetId = this.extractSheetId(sheetUrl);
      if (!sheetId) {
        return { valid: false, error: 'Invalid sheet URL format' };
      }

      let testUrl: string;
      if (apiKey) {
        testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
      } else {
        testUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      }

      console.log('🔗 Testing URL:', testUrl);
      const response = await fetch(testUrl);
      
      if (response.ok) {
        console.log('✅ Sheet access validation successful');
        return { valid: true, message: 'Sheet is accessible' };
      } else {
        console.log('❌ Sheet access validation failed:', response.status, response.statusText);
        if (response.status === 403) {
          return { 
            valid: false, 
            error: apiKey ? 'Invalid API key or insufficient permissions' : 'Sheet is private. Please make it public: Share → Anyone with the link can view' 
          };
        } else if (response.status === 404) {
          return { valid: false, error: 'Sheet not found' };
        } else {
          return { valid: false, error: `Access failed: ${response.statusText}` };
        }
      }
    } catch (error) {
      console.error('❌ Validation error:', error);
      return { valid: false, error: (error as Error).message };
    }
  }
}