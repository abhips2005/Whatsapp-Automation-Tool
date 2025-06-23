import { Router } from 'express';
import { client, isClientReady, waitForClient, reinitializeClient } from '../../source/client';
import { getCurrentContacts } from './contacts';

const router = Router();

// In-memory storage for campaigns
let campaigns: any[] = [];
let campaignIdCounter = 1;

// WhatsApp status endpoint
router.get('/status', async (req, res) => {
  try {
    if (!client) {
      return res.json({ 
        status: 'disconnected', 
        authenticated: false,
        message: 'WhatsApp client not initialized' 
      });
    }

    // Check global status first to avoid calling getState when client isn't ready
    const globalStatus = (global as any).whatsappStatus || 'initializing';
    const globalAuth = (global as any).whatsappAuthenticated || false;

    // Handle special states
    if (globalStatus === 'logging_out') {
      return res.json({
        status: 'logging_out',
        authenticated: false,
        state: 'logging_out',
        message: 'Logging out of WhatsApp...'
      });
    }

    if (globalStatus === 'error' || globalStatus === 'failed') {
      return res.json({
        status: 'error',
        authenticated: false,
        state: globalStatus,
        message: 'WhatsApp client error - please refresh'
      });
    }

    // Only try to get state if we think the client might be ready
    if (globalStatus === 'ready' || globalStatus === 'authenticated') {
      try {
        const state = await client.getState();
        const isAuthenticated = state === 'CONNECTED';
        
        return res.json({
          status: isAuthenticated ? 'authenticated' : (state === 'OPENING' ? 'qr_ready' : 'disconnected'),
          authenticated: isAuthenticated,
          state: state
        });
      } catch (stateError) {
        // Fall back to global status if getState fails
        console.warn('getState failed, using global status:', stateError);
      }
    }

    // Use global status as fallback
    res.json({
      status: globalStatus,
      authenticated: globalAuth,
      state: globalStatus
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({ 
      status: 'disconnected', 
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WhatsApp QR code endpoint
router.get('/qr', async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({ 
        error: 'WhatsApp client not initialized',
        qrCode: null,
        status: 'disconnected'
      });
    }

    // Check global status and QR first
    const globalStatus = (global as any).whatsappStatus || 'initializing';
    const globalQR = (global as any).whatsappQR;
    const globalAuth = (global as any).whatsappAuthenticated || false;

    // If already authenticated, don't try to get state
    if (globalAuth || globalStatus === 'ready' || globalStatus === 'authenticated') {
      return res.json({
        qrCode: null,
        status: 'authenticated',
        message: 'Already authenticated'
      });
    }

    // If we have a QR code available, return it
    if (globalQR) {
      return res.json({
        qrCode: globalQR,
        status: 'qr_ready',
        message: 'Scan QR code to authenticate'
      });
    }

    // Only try getState if we think it's safe
    if (globalStatus === 'ready' || globalStatus === 'authenticated') {
      try {
        const state = await client.getState();
        
        if (state === 'CONNECTED') {
          return res.json({
            qrCode: null,
            status: 'authenticated',
            message: 'Already authenticated'
          });
        }
      } catch (stateError) {
        console.warn('getState failed in QR endpoint:', stateError);
      }
    }

    // Return current status
    res.json({
      qrCode: globalQR,
      status: globalStatus,
      message: globalStatus === 'qr_ready' ? 'Scan QR code to authenticate' : 'Waiting for QR code...'
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate QR code',
      details: error instanceof Error ? error.message : 'Unknown error',
      qrCode: null,
      status: 'error'
    });
  }
});

// Start broadcast campaign - REAL IMPLEMENTATION
router.post('/broadcast', async (req, res) => {
  try {
    const { message, campaignName, filters } = req.body;
    
    if (!message || !campaignName) {
      return res.status(400).json({ 
        error: 'Missing required fields: message and campaignName' 
      });
    }

    // Check if WhatsApp client is ready
    if (!isClientReady()) {
      return res.status(400).json({ 
        error: 'WhatsApp client is not ready. Please ensure WhatsApp is connected and authenticated.' 
      });
    }

    // Get contacts (filtered if filters provided)
    const allContacts = getCurrentContacts();
    let targetContacts = allContacts;
    
    // Apply filters if provided
    if (filters && Object.keys(filters).length > 0) {
      targetContacts = allContacts.filter(contact => {
        return Object.entries(filters).every(([fieldName, filterValue]) => {
          if (!filterValue || String(filterValue).trim() === '') {
            return true; // No filter applied for this field
          }
          
          const contactValue = contact[fieldName];
          if (!contactValue) {
            return false; // Contact doesn't have this field
          }
          
          return String(contactValue).toLowerCase().includes(String(filterValue).toLowerCase());
        });
      });
    }

    if (targetContacts.length === 0) {
      return res.status(400).json({ 
        error: 'No contacts found matching the specified filters' 
      });
    }

    // Create campaign
    const campaignId = `campaign_${campaignIdCounter++}`;
    const campaign = {
      id: campaignId,
      name: campaignName,
      message: message,
      targets: targetContacts.length,
      status: 'running',
      progress: { sent: 0, failed: 0, total: targetContacts.length, errors: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    campaigns.push(campaign);

    // Start REAL message sending process
    processRealBroadcast(campaignId, message, targetContacts);

    res.json({
      success: true,
      campaignId: campaignId,
      targets: targetContacts.length,
      message: `Campaign "${campaignName}" started successfully`
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ 
      error: 'Failed to start broadcast campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// REAL message sending function
async function processRealBroadcast(campaignId: string, message: string, contacts: any[]) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) {
    console.error('Campaign not found:', campaignId);
    return;
  }

  console.log(`🚀 Starting REAL broadcast for campaign ${campaignId} with ${contacts.length} contacts`);

  try {
    // Wait for client to be ready
    if (!isClientReady()) {
      console.log('⏳ WhatsApp client not ready, waiting...');
      await waitForClient(60000); // Wait up to 60 seconds
    }

    // Process contacts one by one
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Clean phone number
        let cleanPhone = contact.phone?.toString().replace(/\D/g, "");
        
        if (!cleanPhone || cleanPhone.length === 0) {
          campaign.progress.failed++;
          campaign.progress.errors.push(`No phone number for ${contact.name}`);
          console.log(`❌ No phone number for ${contact.name}`);
          continue;
        }
        
        // Add country code if not present (assuming India +91)
        if (cleanPhone.length === 10) {
          cleanPhone = "91" + cleanPhone;
        }
        
        // Validate phone number length
        if (cleanPhone.length < 12 || cleanPhone.length > 15) {
          campaign.progress.failed++;
          campaign.progress.errors.push(`Invalid phone number for ${contact.name}: ${contact.phone}`);
          console.log(`❌ Invalid phone number for ${contact.name}: ${contact.phone}`);
          continue;
        }
        
        const chatId = cleanPhone + "@c.us";
        
        // Replace message variables
        const personalizedMessage = message
          .replace(/\{\{name\}\}/g, contact.name || 'there')
          .replace(/\{\{role\}\}/g, contact.assignedRole || contact.role || 'participant')
          .replace(/\{\{project\}\}/g, contact.project || 'N/A')
          .replace(/\{\{branch\}\}/g, contact.branch || 'N/A')
          .replace(/\{\{year\}\}/g, contact.year || 'N/A')
          .replace(/\{\{email\}\}/g, contact.email || 'N/A');
        
        // Check if client is still ready before sending
        if (!isClientReady()) {
          throw new Error('WhatsApp client disconnected during broadcast');
        }
        
        console.log(`📱 Sending to ${contact.name} (${cleanPhone})...`);
        
        // SEND THE ACTUAL MESSAGE
        await client.sendMessage(chatId, personalizedMessage);
        
        campaign.progress.sent++;
        campaign.updatedAt = new Date().toISOString();
        
        console.log(`✅ Message sent to ${contact.name} (${cleanPhone})`);
        
        // Delay between messages (3 seconds for safety)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        campaign.progress.failed++;
        campaign.progress.errors.push(`Failed to send to ${contact.name}: ${error}`);
        
        console.error(`❌ Failed to send message to ${contact.name}:`, error);
      }
    }
    
    campaign.status = 'completed';
    campaign.updatedAt = new Date().toISOString();
    
    console.log(`🎉 Campaign ${campaignId} completed: ${campaign.progress.sent} sent, ${campaign.progress.failed} failed`);
    
  } catch (error) {
    campaign.status = 'failed';
    campaign.updatedAt = new Date().toISOString();
    console.error('❌ Real broadcast error:', error);
  }
}

// Get campaigns
router.get('/campaigns', (req, res) => {
  res.json({
    success: true,
    data: campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });
});

// Get specific campaign
router.get('/campaigns/:id', (req, res) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.json({ success: true, data: campaign });
});

// WhatsApp logout endpoint
router.post('/logout', async (req, res) => {
  try {
    if (!client) {
      return res.json({ 
        success: false, 
        message: 'WhatsApp client not initialized' 
      });
    }

    console.log('🚪 WhatsApp logout requested via routes');
    
    // Reset global status first
    (global as any).whatsappStatus = 'logging_out';
    (global as any).whatsappAuthenticated = false;
    (global as any).whatsappQR = null;
    
    // Logout the client
    await client.logout();
    
    // Update status after logout
    (global as any).whatsappStatus = 'disconnected';
    
    console.log('✅ WhatsApp logout successful - will reinitialize for new QR');
    
    // Send response immediately
    res.json({
      success: true,
      message: 'Successfully logged out from WhatsApp. New QR code will be generated shortly.'
    });
    
    // Reinitialize after a delay using safe method (don't await this)
    setTimeout(async () => {
      try {
        (global as any).whatsappStatus = 'initializing';
        await reinitializeClient();
        console.log('✅ WhatsApp client reinitialized successfully');
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize WhatsApp client:', reinitError);
        (global as any).whatsappStatus = 'error';
        
        // Try one more time after a longer delay
        setTimeout(async () => {
          try {
            console.log('🔄 Retry reinitializing WhatsApp client...');
            (global as any).whatsappStatus = 'initializing';
            await reinitializeClient();
            console.log('✅ WhatsApp client reinitialized on retry');
          } catch (retryError) {
            console.error('❌ Final reinitialize attempt failed:', retryError);
            (global as any).whatsappStatus = 'failed';
          }
        }, 10000);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Reset status even on error
    (global as any).whatsappStatus = 'disconnected';
    (global as any).whatsappAuthenticated = false;
    (global as any).whatsappQR = null;
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to logout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export campaigns for other modules
export const getCampaigns = () => campaigns;
export const getCampaign = (id: string) => campaigns.find(c => c.id === id);

export default router; 