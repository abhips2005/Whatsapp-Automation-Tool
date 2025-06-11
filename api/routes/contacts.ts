import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { csv2json } from 'json-2-csv';
import { simplifiedDataZod } from '../../script/validation';

const router = Router();

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

// In-memory storage for current data
let currentData: any[] = [];

// Upload and analyze CSV structure (without processing)
router.post('/analyze-csv', upload.single('csv'), async (req, res) => {
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
router.post('/process-csv', async (req, res) => {
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
router.get('/', (req, res) => {
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

// Helper function to get breakdown of data by field
function getBreakdown(data: any[], field: string) {
  return data.reduce((acc, item) => {
    const value = item[field] || 'Unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Export current data getter for other modules
export const getCurrentContacts = () => currentData;
export const setCurrentContacts = (data: any[]) => { currentData = data; };

export default router; 