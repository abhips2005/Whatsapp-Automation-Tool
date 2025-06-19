import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Import existing functionality
import { dataZod, simplifiedDataZod } from '../script/validation';
import { json2csv, csv2json } from 'json-2-csv';

// Job Queue Setup
import Queue from 'bull';
import Redis from 'ioredis';

// Import modular routes
import contactsRoutes from './routes/contacts';
import whatsappRoutes from './routes/whatsapp';
import previewRoutes from './routes/preview';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis connection for job queue with error handling
let redis: Redis | null = null;
let broadcastQueue: Queue.Queue | null = null;
let certificateQueue: Queue.Queue | null = null;

// Initialize Redis connection
async function initializeRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailedConnection: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Add error handler to suppress unhandled error events
    redis.on('error', (error) => {
      // Silently handle Redis connection errors
      console.log('Redis connection issue (continuing without Redis)');
    });

    // Test Redis connection
    await redis.ping();
    
    // Job Queues - only create if Redis is available
    broadcastQueue = new Queue('broadcast jobs', { redis });
    certificateQueue = new Queue('certificate jobs', { redis });
    
    console.log('✅ Redis connected - Job queues enabled');
  } catch (error) {
    console.warn('⚠️ Redis not available - Job queues disabled. Broadcasting will run synchronously.');
    console.warn('To enable job queues, start Redis server: redis-server');
    
    // Clean up Redis instance to prevent further errors
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    broadcastQueue = null;
    certificateQueue = null;
  }
}

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In-memory storage for campaigns and data
let campaigns: Map<string, any> = new Map();
let currentData: any[] = [];

// Socket.io connection handling with connection tracking
let activeConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  
  // Only log every 10th connection to reduce spam
  if (activeConnections % 10 === 1) {
    console.log(`📱 WebSocket clients: ${activeConnections} active connections`);
  }
  
  socket.on('disconnect', (reason) => {
    activeConnections--;
    
    // Log disconnections with reasons if they seem problematic
    if (reason !== 'client namespace disconnect' && activeConnections % 10 === 0) {
      console.log(`📱 Client disconnected (${reason}). Active: ${activeConnections}`);
    }
  });

  // Join campaign room for real-time updates
  socket.on('join-campaign', (campaignId: string) => {
    socket.join(`campaign-${campaignId}`);
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      websocket: 'running',
      whatsapp: 'available'
    }
  });
});

// Upload and analyze CSV structure (without processing)
app.post('/api/analyze-csv', upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    
    // Parse CSV to get structure
    const json = csv2json(csvContent, {
      trimHeaderFields: true,
      trimFieldValues: true,
    });

    const availableColumns = Object.keys(json[0] || {});
    const sampleData = json.slice(0, 5); // First 5 rows for preview
    
    // Don't delete the file yet - we'll need it for processing
    const tempFilePath = req.file.path;
    
    res.json({
      success: true,
      availableColumns,
      sampleData,
      tempFilePath,
      totalRows: json.length,
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
    console.error('CSV analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze CSV', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Process CSV with field mapping
app.post('/api/process-csv', async (req, res) => {
  try {
    const { tempFilePath, fieldMapping } = req.body;
    
    if (!tempFilePath || !fieldMapping) {
      return res.status(400).json({ error: 'Missing temp file path or field mapping' });
    }

    if (!fs.existsSync(tempFilePath)) {
      return res.status(400).json({ error: 'Temp file not found. Please re-upload the CSV.' });
    }

    const csvContent = fs.readFileSync(tempFilePath, 'utf-8');
    
    // Parse CSV using existing logic
    const json = csv2json(csvContent, {
      trimHeaderFields: true,
      trimFieldValues: true,
    });

    console.log('📄 Parsed CSV sample:', json.slice(0, 2));
    console.log('📋 CSV columns found:', Object.keys(json[0] || {}));
    console.log('🗺️ Field mapping received:', fieldMapping);

    // Filter out empty rows and transform using field mapping
    console.log('📊 Total rows from CSV:', json.length);
    const transformedData = json
      .filter((row, index) => {
        // Filter out completely empty rows
        const values = Object.values(row);
        const hasContent = values.some(val => val && String(val).trim().length > 0);
        if (!hasContent) {
          console.log(`🚫 Filtering out empty row ${index}`);
        }
        return hasContent;
      })
      .map(entry => {
        const mapped: any = {};
        
        // Apply field mapping
        Object.entries(fieldMapping).forEach(([targetField, sourceColumn]) => {
          if (sourceColumn && sourceColumn !== 'null' && sourceColumn !== '' && entry[sourceColumn as string] !== undefined) {
            const value = entry[sourceColumn as string];
            // Clean and process the value
            if (value !== null && value !== undefined) {
              mapped[targetField] = String(value).trim();
            }
          }
        });
        
        // Set default values for missing required fields
        if (!mapped.name && mapped.email) {
          mapped.name = mapped.email.split('@')[0]; // Use email prefix as fallback name
        }
        
        if (!mapped.type && mapped.role) {
          mapped.type = mapped.role;
        } else if (!mapped.type) {
          mapped.type = 'participant';
        }

        return mapped;
      })
      .filter((entry, index) => {
        // Filter out entries without essential data
        const hasName = entry.name && entry.name.trim().length > 0;
        const hasValidEmail = entry.email && entry.email.trim().length > 0 && entry.email.includes('@') && entry.email.includes('.');
        
        // Skip obvious non-contact entries
        const isMetadataRow = entry.name && (
          entry.name.toLowerCase() === 'project' ||
          entry.name.toLowerCase().startsWith('parking data') ||
          entry.name.length > 100 // Very long names are likely descriptions
        );
        
        const isValid = hasName && (hasValidEmail || !isMetadataRow) && !isMetadataRow;
        
        if (!isValid) {
          console.log(`🚫 Filtering out entry ${index}:`, {
            name: entry.name || 'MISSING',
            email: entry.email || 'MISSING',
            hasName,
            hasValidEmail,
            isMetadataRow,
            reason: isMetadataRow ? 'Metadata/header row' : !hasName ? 'Missing name' : !hasValidEmail ? 'Missing/invalid email' : 'Unknown'
          });
        } else if (hasName && !hasValidEmail) {
          // For entries with name but no email, generate a placeholder
          entry.email = `${entry.name.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`;
          console.log(`📧 Generated placeholder email for "${entry.name}": ${entry.email}`);
        }
        
        return isValid;
      });

    console.log('🔄 Transformed data sample:', JSON.stringify(transformedData[0] || {}, null, 2));
    console.log('📊 Transformed entries:', transformedData.length);

    // Validate transformed data
    console.log('🔄 About to validate transformed data, sample entry:', JSON.stringify(transformedData[0] || {}, null, 2));
    
    let validatedJson = [];
    
    if (transformedData.length === 0) {
      console.warn('⚠️ No data to validate after transformation');
      validatedJson = [];
    } else {
      try {
        validatedJson = simplifiedDataZod.parse(transformedData);
        console.log('✅ Final validation passed for', validatedJson.length, 'entries');
      } catch (finalValidationError) {
        console.error('❌ Final validation failed:', finalValidationError);
        
        // Try to validate each entry individually to find the problematic ones
        const validEntries = [];
        const invalidEntries = [];
        
        for (let i = 0; i < transformedData.length; i++) {
          try {
            // Validate single entry by wrapping in array and unwrapping
            const singleEntryArray = [transformedData[i]];
            const validatedArray = simplifiedDataZod.parse(singleEntryArray);
            validEntries.push(validatedArray[0]);
          } catch (entryError) {
            console.error(`❌ Entry ${i} failed validation:`, JSON.stringify(transformedData[i], null, 2));
            console.error(`❌ Error:`, entryError instanceof Error ? entryError.message : 'Unknown error');
            invalidEntries.push({ 
              index: i, 
              entry: transformedData[i], 
              error: entryError instanceof Error ? entryError.message : 'Unknown error' 
            });
          }
        }
        
        console.log(`✅ ${validEntries.length} valid entries, ❌ ${invalidEntries.length} invalid entries`);
        validatedJson = validEntries;
        
        // If no valid entries, provide better error message
        if (validEntries.length === 0) {
          const firstError = invalidEntries[0];
          throw new Error(`No valid entries found. First error: ${firstError?.error || 'Unknown validation error'}`);
        }
      }
    }
    
    // Store in memory and save to file
    currentData = validatedJson;
    
    // Save processed data
    const outputDir = path.join(process.cwd(), 'script', 'certificates');
    const outputPath = path.join(outputDir, 'out.json');
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(validatedJson, null, 2));
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp file:', cleanupError);
    }

    res.json({
      success: true,
      data: validatedJson,
      stats: {
        total: json.length,
        valid: validatedJson.length,
        filtered: json.length - validatedJson.length
      },
      breakdown: {
        roles: getBreakdown(validatedJson, 'assignedRole'),
        years: getBreakdown(validatedJson, 'year'),
        branches: getBreakdown(validatedJson, 'branch')
      }
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get current data
app.get('/api/contacts', (req, res) => {
  const { role, year, branch, search, ...dynamicFilters } = req.query;
  
  let filteredData = [...currentData];
  
  // Legacy filters for backward compatibility
  if (role) {
    filteredData = filteredData.filter(contact => 
      contact.assignedRole?.toLowerCase().includes((role as string).toLowerCase()) ||
      contact.role?.toLowerCase().includes((role as string).toLowerCase())
    );
  }
  
  if (year) {
    filteredData = filteredData.filter(contact => 
      contact.year?.toString() === year
    );
  }
  
  if (branch) {
    filteredData = filteredData.filter(contact => 
      contact.branch?.toLowerCase().includes((branch as string).toLowerCase())
    );
  }
  
  // Dynamic filters - apply any other filter parameters
  Object.entries(dynamicFilters).forEach(([fieldName, filterValue]) => {
    if (filterValue && typeof filterValue === 'string' && filterValue.trim() !== '') {
      filteredData = filteredData.filter(contact => {
        const contactValue = contact[fieldName];
        if (!contactValue) return false;
        
        return String(contactValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    }
  });
  
  // Search filter
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filteredData = filteredData.filter(contact => 
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower)
    );
  }

  res.json({
    data: filteredData,
    total: filteredData.length,
    breakdown: {
      roles: getBreakdown(filteredData, 'assignedRole'),
      years: getBreakdown(filteredData, 'year'),
      branches: getBreakdown(filteredData, 'branch')
    }
  });
});

// Start broadcast campaign
app.post('/api/broadcast/start', async (req, res) => {
  try {
    const { message, filters, campaignName } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Apply filters to get target audience
    let targetContacts = [...currentData];
    if (filters) {
      targetContacts = applyFilters(targetContacts, filters);
    }

    if (targetContacts.length === 0) {
      return res.status(400).json({ error: 'No contacts match the filters' });
    }

    const campaignId = `campaign-${Date.now()}`;
    const campaign = {
      id: campaignId,
      name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
      message,
      filters,
      targets: targetContacts,
      status: 'queued',
      progress: {
        total: targetContacts.length,
        sent: 0,
        failed: 0,
        errors: []
      },
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    campaigns.set(campaignId, campaign);

    // Add job to queue or process immediately if Redis is not available
    if (broadcastQueue) {
      const job = await broadcastQueue.add('send-broadcast', {
        campaignId,
        message,
        contacts: targetContacts
      });

      res.json({
        success: true,
        campaignId,
        jobId: job.id,
        targets: targetContacts.length
      });
    } else {
      // Process immediately without queue
      processDirectBroadcast(campaignId, message, targetContacts);
      
      res.json({
        success: true,
        campaignId,
        jobId: null,
        targets: targetContacts.length,
        note: 'Processing without job queue (Redis unavailable)'
      });
    }

  } catch (error) {
    console.error('Broadcast start error:', error);
    res.status(500).json({ 
      error: 'Failed to start broadcast', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// WhatsApp QR Code endpoint
app.get('/api/whatsapp/qr', (req, res) => {
  res.json({
    qrCode: global.whatsappQR || null,
    status: global.whatsappStatus || 'disconnected'
  });
});

// WhatsApp status endpoint
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: global.whatsappStatus || 'disconnected',
    authenticated: global.whatsappAuthenticated || false
  });
});

// WhatsApp logout endpoint
app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    console.log('🚪 WhatsApp logout requested');
    
    // Import WhatsApp client
    const { client } = await import('../source/client');
    
    // Logout the client
    await client.logout();
    
    // Reset global status
    (global as any).whatsappQR = null;
    (global as any).whatsappStatus = 'disconnected';
    (global as any).whatsappAuthenticated = false;
    
    console.log('✅ WhatsApp logout successful');
    
    // Wait a bit for the logout to complete, then reinitialize
    setTimeout(async () => {
      try {
        console.log('🔄 Reinitializing WhatsApp client for new QR code...');
        client.initialize();
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize WhatsApp client:', reinitError);
      }
    }, 2000);
    
    res.json({
      success: true,
      message: 'WhatsApp logged out successfully. You can now scan a new QR code.'
    });
    
  } catch (error) {
    console.error('❌ WhatsApp logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from WhatsApp',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get campaign status
app.get('/api/broadcast/status/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  const campaign = campaigns.get(campaignId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.json(campaign);
});

// Get all campaigns
app.get('/api/campaigns', (req, res) => {
  const allCampaigns = Array.from(campaigns.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(allCampaigns);
});

// Generate certificates
app.post('/api/certificates/generate', async (req, res) => {
  try {
    const { filters } = req.body;
    
    let targetContacts = [...currentData];
    if (filters) {
      targetContacts = applyFilters(targetContacts, filters);
    }

    const jobId = `cert-${Date.now()}`;
    
    if (certificateQueue) {
      // Add to certificate queue
      const job = await certificateQueue.add('generate-certificates', {
        jobId,
        contacts: targetContacts
      });

      res.json({
        success: true,
        jobId: job.id,
        targets: targetContacts.length
      });
    } else {
      res.json({
        success: false,
        error: 'Certificate generation requires Redis job queue',
        note: 'Please start Redis server and restart the application'
      });
    }

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ 
      error: 'Failed to start certificate generation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get available filter options based on current data
app.get('/api/filter-options', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Filter options are now dynamically generated from contact data',
    filters: []
  });
});

// Utility functions
function getBreakdown(data: any[], field: string) {
  return data.reduce((acc, item) => {
    const value = item[field] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function applyFilters(data: any[], filters: any) {
  let filtered = [...data];
  
  // Legacy filters for backward compatibility
  if (filters.roles && filters.roles.length > 0) {
    filtered = filtered.filter(contact => 
      filters.roles.includes(contact.assignedRole) ||
      filters.roles.includes(contact.role)
    );
  }
  
  if (filters.years && filters.years.length > 0) {
    filtered = filtered.filter(contact => 
      filters.years.includes(contact.year?.toString())
    );
  }
  
  if (filters.branches && filters.branches.length > 0) {
    filtered = filtered.filter(contact => 
      filters.branches.includes(contact.branch)
    );
  }
  
  // Dynamic filters - handle any field-based filters
  Object.entries(filters).forEach(([fieldName, filterValues]) => {
    // Skip legacy filters and empty values
    if (['roles', 'years', 'branches', 'search'].includes(fieldName) || 
        !filterValues || 
        (Array.isArray(filterValues) && filterValues.length === 0)) {
      return;
    }
    
    // Convert single value to array for consistent handling
    const values = Array.isArray(filterValues) ? filterValues : [filterValues];
    
    if (values.length > 0 && values.some(v => v && String(v).trim() !== '')) {
      filtered = filtered.filter(contact => {
        const contactValue = contact[fieldName];
        if (!contactValue) return false;
        
        return values.some(filterValue => 
          String(contactValue).toLowerCase().includes(String(filterValue).toLowerCase())
        );
      });
    }
  });
  
  return filtered;
}

// Direct broadcast processing function (when Redis is not available)
async function processDirectBroadcast(campaignId: string, message: string, contacts: any[]) {
  const campaign = campaigns.get(campaignId);
  
  if (!campaign) {
    console.error('Campaign not found:', campaignId);
    return;
  }

  campaign.status = 'running';
  campaign.startedAt = new Date().toISOString();
  
  // Emit campaign started
  io.to(`campaign-${campaignId}`).emit('campaign-started', campaign);

  try {
    // Import WhatsApp client and check readiness
    const { client, waitForClient, isClientReady } = await import('../source/client');
    
    // Wait for client to be ready before proceeding
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
          continue;
        }
        
        if (cleanPhone.length === 10) {
          cleanPhone = "91" + cleanPhone;
        }
        
        if (cleanPhone.length < 12 || cleanPhone.length > 15) {
          campaign.progress.failed++;
          campaign.progress.errors.push(`Invalid phone number for ${contact.name}: ${contact.phone}`);
          continue;
        }
        
        const chatId = cleanPhone + "@c.us";
        
        // Replace message variables
        const personalizedMessage = message
          .replace(/\{\{name\}\}/g, contact.name)
          .replace(/\{\{role\}\}/g, contact.assignedRole || 'participant')
          .replace(/\{\{project\}\}/g, contact.project || 'N/A')
          .replace(/\{\{branch\}\}/g, contact.branch || 'N/A');
        
        // Check if client is still ready before sending
        if (!isClientReady()) {
          throw new Error('WhatsApp client disconnected during broadcast');
        }
        
        await client.sendMessage(chatId, personalizedMessage);
        
        campaign.progress.sent++;
        
        // Emit progress update
        io.to(`campaign-${campaignId}`).emit('campaign-progress', {
          campaignId,
          progress: campaign.progress,
          currentContact: contact.name
        });
        
        // Delay between messages (5 seconds)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        campaign.progress.failed++;
        campaign.progress.errors.push(`Failed to send to ${contact.name}: ${error}`);
        
        console.error(`Failed to send message to ${contact.name}:`, error);
      }
    }
    
    campaign.status = 'completed';
    campaign.completedAt = new Date().toISOString();
    
    // Emit campaign completed
    io.to(`campaign-${campaignId}`).emit('campaign-completed', campaign);
    
  } catch (error) {
    campaign.status = 'failed';
    campaign.completedAt = new Date().toISOString();
    console.error('Direct broadcast error:', error);
    
    io.to(`campaign-${campaignId}`).emit('campaign-failed', {
      campaignId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Job Processing (only if queue is available)
if (broadcastQueue) {
broadcastQueue.process('send-broadcast', async (job) => {
  const { campaignId, message, contacts } = job.data;
  const campaign = campaigns.get(campaignId);
  
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  campaign.status = 'running';
  campaign.startedAt = new Date().toISOString();
  
  // Emit campaign started
  io.to(`campaign-${campaignId}`).emit('campaign-started', campaign);

  // Import WhatsApp client and check readiness
  const { client, waitForClient, isClientReady } = await import('../source/client');
  
  // Wait for client to be ready before proceeding
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
        continue;
      }
      
      if (cleanPhone.length === 10) {
        cleanPhone = "91" + cleanPhone;
      }
      
      if (cleanPhone.length < 12 || cleanPhone.length > 15) {
        campaign.progress.failed++;
        campaign.progress.errors.push(`Invalid phone number for ${contact.name}: ${contact.phone}`);
        continue;
      }
      
      const chatId = cleanPhone + "@c.us";
      
      // Replace message variables
      const personalizedMessage = message
        .replace(/\{\{name\}\}/g, contact.name)
        .replace(/\{\{role\}\}/g, contact.assignedRole || 'participant')
        .replace(/\{\{project\}\}/g, contact.project || 'N/A')
        .replace(/\{\{branch\}\}/g, contact.branch || 'N/A');
      
      // Check if client is still ready before sending
      if (!isClientReady()) {
        throw new Error('WhatsApp client disconnected during broadcast');
      }
      
      await client.sendMessage(chatId, personalizedMessage);
      
      campaign.progress.sent++;
      
      // Emit progress update
      io.to(`campaign-${campaignId}`).emit('campaign-progress', {
        campaignId,
        progress: campaign.progress,
        currentContact: contact.name
      });
      
      // Update job progress
      job.progress((i + 1) / contacts.length * 100);
      
      // Delay between messages (5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      campaign.progress.failed++;
      campaign.progress.errors.push(`Failed to send to ${contact.name}: ${error}`);
      
      console.error(`Failed to send message to ${contact.name}:`, error);
    }
  }
  
  campaign.status = 'completed';
  campaign.completedAt = new Date().toISOString();
  
  // Emit campaign completed
  io.to(`campaign-${campaignId}`).emit('campaign-completed', campaign);
  
  return campaign;
});
} // End of broadcastQueue conditional

app.use('/api/preview', previewRoutes);

const PORT = process.env.PORT || 5000;

// Initialize WhatsApp client
async function initializeWhatsApp() {
  try {
    console.log('📱 Initializing WhatsApp client...');
    // Import and start WhatsApp client
    const { client } = await import('../source/client');
    client.initialize();
    console.log('📱 WhatsApp client initialization started');
    console.log('📱 QR Code will be available at: http://localhost:5000/api/whatsapp/qr');
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp client:', error);
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 Server is running!
📍 Port: ${PORT}
🌐 API: http://localhost:${PORT}/api
🔗 WebSocket: ws://localhost:${PORT}
💻 Frontend: http://localhost:3001

📁 Available Endpoints:
   GET  /api/health
   GET  /api/contacts
   POST /api/contacts/analyze-csv
   POST /api/contacts/process-csv
   GET  /api/whatsapp/status
   GET  /api/whatsapp/qr
   POST /api/whatsapp/logout
   POST /api/whatsapp/broadcast
   GET  /api/whatsapp/campaigns
`);
  
  // Initialize Redis connection
  await initializeRedis();
  
  // Initialize WhatsApp client
  await initializeWhatsApp();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📪 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📪 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app; 