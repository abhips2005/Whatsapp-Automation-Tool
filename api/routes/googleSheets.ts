import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';  // ✅ Correct import
import { GoogleSheetsService } from '../services/googleSheetsService';

const router = Router();

/**
 * Import from Google Sheets by converting to CSV and using existing CSV logic
 */
router.post('/import', async (req, res) => {
  console.log('📊 Google Sheets import request received');
  
  try {
    const { sheetUrl, apiKey } = req.body;
    console.log('📊 Request data:', { 
      sheetUrl: sheetUrl?.substring(0, 50) + '...', 
      hasApiKey: !!apiKey 
    });

    // Validate input
    if (!sheetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Sheet URL is required'
      });
    }

    console.log('📊 Fetching Google Sheet as CSV...');

    // Fetch Google Sheets as CSV content
    const csvContent = await GoogleSheetsService.fetchAsCSV(sheetUrl, apiKey);
    
    console.log('📊 Got CSV content, length:', csvContent.length);

    // Create temporary file (same as file upload in contacts.ts)
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const tempFileName = `gs_${Date.now()}_${Math.random().toString(36).slice(2, 11)}.csv`; // ✅ Fixed
    const tempFilePath = path.join(uploadsDir, tempFileName);
    
    // Write CSV content to temp file
    fs.writeFileSync(tempFilePath, csvContent, 'utf-8');
    
    console.log('📊 Created temp CSV file:', tempFilePath);

    // Parse CSV to get structure using csvtojson
    const json = await csv({
      trim: true,
      checkType: false,
      ignoreEmpty: true
    }).fromString(csvContent);
    
    if (json.length === 0) {
      throw new Error('No data found in the sheet');
    }
    
    const availableColumns = Object.keys(json[0] || {});
    const sampleData = json.slice(0, 5); // First 5 rows for preview
    
    console.log('📊 Available columns:', availableColumns);
    console.log('📊 Sample data rows:', sampleData.length);

    // Return the same format as CSV analysis endpoint (reuse existing UI)
    res.json({
      success: true,
      availableColumns,
      sampleData,
      tempFilePath,
      totalRows: json.length,
      source: 'google_sheets', // Mark the source
      expectedFields: {
        name: { required: true, description: 'Full name of the person' },
        email: { required: true, description: 'Email address' },
        phone: { required: true, description: 'Mobile/phone number' },
        role: { required: false, description: 'Role or position' },
        year: { required: false, description: 'Year of study' },
        branch: { required: false, description: 'Branch or department' },
        github: { required: false, description: 'GitHub or portfolio link' },
        mentor: { required: false, description: 'Mentor preference' },
        project: { required: false, description: 'Assigned project' },
      }
    });

  } catch (error) {
    console.error('❌ Google Sheets import error:', (error as Error).message);
    console.error('❌ Full error:', error);
    
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Test Google Sheets connection
 */
router.post('/test', async (req, res) => {
  console.log('🧪 Testing Google Sheets connection');
  
  try {
    const { sheetUrl, apiKey } = req.body;
    console.log('🧪 Test request:', { 
      sheetUrl: sheetUrl?.substring(0, 50) + '...', 
      hasApiKey: !!apiKey 
    });

    if (!sheetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Sheet URL is required'
      });
    }

    // Validate sheet access
    const validation = await GoogleSheetsService.validateSheetAccess(sheetUrl, apiKey);
    
    if (validation.valid) {
      console.log('✅ Connection test successful');
      res.json({
        success: true,
        message: validation.message
      });
    } else {
      console.log('❌ Connection test failed:', validation.error);
      res.json({
        success: false,
        error: validation.error
      });
    }

  } catch (error) {
    console.error('❌ Connection test error:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Connection test failed: ' + (error as Error).message
    });
  }
});

export default router;