import { Router } from 'express';
import { client } from '../../source/client';
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

    const state = await client.getState();
    const isAuthenticated = state === 'CONNECTED';
    
    res.json({
      status: isAuthenticated ? 'authenticated' : (state === 'OPENING' ? 'qr_ready' : 'disconnected'),
      authenticated: isAuthenticated,
      state: state
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

    const state = await client.getState();
    
    if (state === 'CONNECTED') {
      return res.json({
        qrCode: null,
        status: 'authenticated',
        message: 'Already authenticated'
      });
    }

    // For demo purposes, we'll return a placeholder QR
    // In production, this would come from the actual WhatsApp client
    const qrCode = `whatsapp://send?phone=1234567890&text=Demo%20QR%20Code%20${Date.now()}`;
    
    res.json({
      qrCode: qrCode,
      status: 'qr_ready',
      message: 'Scan QR code to authenticate'
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

// Start broadcast campaign
router.post('/broadcast', async (req, res) => {
  try {
    const { message, campaignName, filters } = req.body;
    
    if (!message || !campaignName) {
      return res.status(400).json({ 
        error: 'Missing required fields: message and campaignName' 
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
      progress: { sent: 0, failed: 0, total: targetContacts.length },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    campaigns.push(campaign);

    // Simulate sending messages (replace with actual WhatsApp integration)
    setTimeout(() => {
      simulateCampaignProgress(campaignId, targetContacts);
    }, 1000);

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

// Helper function to simulate campaign progress
function simulateCampaignProgress(campaignId: string, contacts: any[]) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return;

  let sent = 0;
  let failed = 0;
  const total = contacts.length;

  const sendBatch = () => {
    const batchSize = Math.min(5, total - sent - failed);
    
    for (let i = 0; i < batchSize; i++) {
      setTimeout(() => {
        // Simulate 95% success rate
        if (Math.random() > 0.05) {
          sent++;
        } else {
          failed++;
        }

        // Update campaign progress
        campaign.progress = { sent, failed, total };
        campaign.updatedAt = new Date().toISOString();

        // Check if campaign is complete
        if (sent + failed >= total) {
          campaign.status = 'completed';
          console.log(`✅ Campaign ${campaignId} completed: ${sent} sent, ${failed} failed`);
        }
      }, i * 500); // 500ms delay between messages
    }

    // Schedule next batch
    if (sent + failed < total) {
      setTimeout(sendBatch, batchSize * 500 + 1000);
    }
  };

  sendBatch();
}

// Export campaigns for other modules
export const getCampaigns = () => campaigns;
export const getCampaign = (id: string) => campaigns.find(c => c.id === id);

export default router; 