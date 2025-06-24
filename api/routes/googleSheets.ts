import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';  // ✅ Correct import
import { GoogleSheetsService } from '../services/googleSheetsService';
import { getCurrentContacts, setCurrentContacts } from './contacts';

const router = Router();

// In-memory storage for auto-sync configurations
let autoSyncConfigs: Map<string, any> = new Map();

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

/**
 * Setup Auto-Sync for Google Sheets
 */
router.post('/setup-auto-sync', async (req, res) => {
  console.log('⚙️ Setting up Google Sheets auto-sync');
  
  try {
    const { 
      sheetUrl, 
      apiKey, 
      syncInterval, 
      autoMessage, 
      welcomeMessage,
      fieldMapping 
    } = req.body;

    // Validate required fields
    if (!sheetUrl || !apiKey || !syncInterval || !fieldMapping) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sheetUrl, apiKey, syncInterval, and fieldMapping are required'
      });
    }

    // Test connection first
    const validation = await GoogleSheetsService.validateSheetAccess(sheetUrl, apiKey);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Failed to connect to sheet: ' + validation.error
      });
    }

    // Create auto-sync configuration
    const configId = `sync_${Date.now()}`;
    const config = {
      id: configId,
      sheetUrl,
      apiKey,
      syncInterval: parseInt(syncInterval),
      autoMessage: Boolean(autoMessage),
      welcomeMessage: welcomeMessage || 'Welcome! You\'ve been added to our updates.',
      fieldMapping,
      isActive: true,
      lastSync: null,
      createdAt: new Date().toISOString()
    };

    // Store configuration
    autoSyncConfigs.set(configId, config);

    // Schedule periodic sync (in production, use a proper job scheduler like node-cron)
    schedulePeriodicSync(config);

    console.log('✅ Auto-sync configured:', configId);
    
    res.json({
      success: true,
      message: 'Auto-sync configured successfully',
      configId,
      nextSync: new Date(Date.now() + config.syncInterval * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('❌ Auto-sync setup error:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to setup auto-sync: ' + (error as Error).message
    });
  }
});

/**
 * Get Auto-Sync status
 */
router.get('/auto-sync-status', (req, res) => {
  const configs = Array.from(autoSyncConfigs.values()).map(config => ({
    id: config.id,
    sheetUrl: config.sheetUrl.substring(0, 50) + '...',
    syncInterval: config.syncInterval,
    isActive: config.isActive,
    lastSync: config.lastSync,
    createdAt: config.createdAt
  }));

  res.json({
    success: true,
    configs,
    totalConfigs: configs.length
  });
});

/**
 * Schedule periodic sync (simplified version - in production use node-cron)
 */
function schedulePeriodicSync(config: any) {
  const intervalMs = config.syncInterval * 60 * 1000; // Convert minutes to milliseconds
  
  const performSync = async () => {
    if (!config.isActive) {
      console.log(`⏸️ Auto-sync ${config.id} is disabled, skipping`);
      return;
    }

    try {
      console.log(`🔄 Performing auto-sync for ${config.id}`);
      
      // Fetch latest data from sheet
      const csvContent = await GoogleSheetsService.fetchAsCSV(config.sheetUrl, config.apiKey);
      
      // Parse CSV
      const json = await csv({
        trim: true,
        checkType: false,
        ignoreEmpty: true
      }).fromString(csvContent);

      // Transform data using field mapping (simplified)
      const transformedData = json.map((entry: any) => {
        const mapped: any = {};
        Object.entries(config.fieldMapping).forEach(([targetField, sourceColumn]) => {
          if (sourceColumn && entry[sourceColumn as string] !== undefined) {
            mapped[targetField] = String(entry[sourceColumn as string]).trim();
          }
        });
        
        // Set defaults
        if (!mapped.type) mapped.type = 'participant';
        return mapped;
      }).filter((entry: any) => entry.name && entry.email);

      // Get current contacts
      const currentContacts = getCurrentContacts();
      const existingEmails = new Set(currentContacts.map((c: any) => c.email));
      
      // Find new contacts
      const newContacts = transformedData.filter((contact: any) => 
        !existingEmails.has(contact.email)
      );

      if (newContacts.length > 0) {
        console.log(`📧 Found ${newContacts.length} new contacts`);
        
        // Add new contacts
        const updatedContacts = [...currentContacts, ...newContacts];
        setCurrentContacts(updatedContacts);
        
        // TODO: Send welcome messages if autoMessage is enabled
        // This would require integrating with the WhatsApp client
        if (config.autoMessage && newContacts.length > 0) {
          console.log(`📱 Would send welcome messages to ${newContacts.length} new contacts`);
          // Implementation would go here
        }
      } else {
        console.log(`✅ No new contacts found in sync ${config.id}`);
      }

      // Update last sync time
      config.lastSync = new Date().toISOString();
      autoSyncConfigs.set(config.id, config);

    } catch (error) {
      console.error(`❌ Auto-sync ${config.id} failed:`, error);
    }
  };

  // Perform initial sync after 30 seconds
  setTimeout(performSync, 30000);
  
  // Schedule recurring sync
  setInterval(performSync, intervalMs);
  
  console.log(`⏰ Scheduled auto-sync ${config.id} every ${config.syncInterval} minutes`);
}

export default router;