# 🔧 CSV Processing Troubleshooting Guide

## Common Issues & Solutions

### **Error: 500 Internal Server Error on /process-csv**

#### **Possible Causes:**
1. **Invalid field mapping** - Missing required fields (name, email, type)
2. **File path issues** - Temporary file not found
3. **Data validation errors** - Invalid email formats or missing data
4. **Directory permissions** - Cannot create output directory

#### **Solutions:**

##### **1. Check Field Mapping**
Ensure you've mapped these **required fields**:
- `name` → Must map to a column with actual names
- `email` → Must map to a column with valid email addresses  
- `mobile number` → Must map to a mobile number column

##### **2. Verify CSV Data Quality**
Your CSV should have:
```csv
Name,Email,Role
John Doe,john@example.com,Developer
Jane Smith,jane@example.com,Designer
```

**Avoid:**
- Empty rows
- Header-only rows
- Invalid email formats (missing @ or .)
- Very long names (>100 characters)

##### **3. Check Server Logs**
Look for specific error messages in the console:
```bash
# Run the API server with logs
bun run api
```

Common error patterns:
- `❌ Final validation failed` → Data doesn't match expected format
- `❌ Entry X failed validation` → Specific row has invalid data
- `⚠️ No data to validate` → All rows were filtered out

##### **4. Test with Minimal CSV**
Create a test file with just 2-3 rows:
```csv
Name,Email,Type
Test User,test@example.com,participant
Demo User,demo@example.com,admin
```

### **Quick Fixes:**

#### **Fix 1: Reset and Re-upload**
```bash
# Clear uploads directory
rm -rf uploads/*
rm -rf api/uploads/*

# Restart server
bun run api
```

#### **Fix 2: Manual File Check**
Check if your CSV has:
- UTF-8 encoding
- Proper commas (not semicolons)
- No special characters in headers
- Consistent column count per row

#### **Fix 3: Directory Permissions**
```bash
# Ensure directories exist and are writable
mkdir -p script/certificates
mkdir -p uploads
chmod 755 script/certificates
chmod 755 uploads
```

### **Step-by-Step Debug Process:**

1. **Upload CSV and check analysis**
   - Does `/analyze-csv` work?
   - Are columns detected correctly?
   - Is sample data showing properly?

2. **Check field mapping**
   - Are all required fields mapped?
   - Is field mapping object formatted correctly?
   ```json
   {
     "name": "Name Column",
     "email": "Email Column", 
     "type": "Role Column"
   }
   ```

3. **Verify data format**
   - Are there any completely empty rows?
   - Do emails contain @ and . symbols?
   - Are names reasonable length (<100 chars)?

4. **Check server response**
   - Look at browser Network tab
   - Check server console for specific errors
   - Verify the response body for error details

### **Prevention Tips:**

- **Clean your CSV** before upload:
  - Remove empty rows
  - Validate email formats
  - Ensure consistent data format
  
- **Use standard column names:**
  - Name, Email, Phone, Role, etc.
  - Avoid special characters in headers
  
- **Test with small files first:**
  - Upload 5-10 rows initially
  - Scale up after successful processing

### **Still Having Issues?**

1. **Check the exact error message** in browser console
2. **Share the CSV structure** (first few rows)
3. **Verify server logs** for detailed error info
4. **Try with a different CSV file** to isolate the issue

---

**Need help?** Check the server logs or contact the development team with:
- The specific error message
- A sample of your CSV file (first 3-5 rows)
- The field mapping you're using 