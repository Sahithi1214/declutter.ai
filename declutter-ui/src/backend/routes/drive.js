const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const { validateGoogleToken } = require('../middleware/auth');

// File categorization constants (same as in scan.js)
const FILE_CATEGORIES = {
  IMAGES: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif']
  },
  VIDEOS: {
    mimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv', 'video/m4v'],
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v']
  },
  AUDIO: {
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac', 'audio/wma'],
    extensions: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.wma']
  },
  DOCUMENTS: {
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']
  }
};

// Categorize file based on MIME type and extension
function categorizeFile(file) {
  const mimeType = file.mimeType || '';
  const fileName = file.name || '';
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  // Check MIME types first
  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    if (config.mimeTypes.includes(mimeType)) {
      return category.toLowerCase();
    }
  }

  // Fallback to extension check
  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    if (config.extensions.includes(extension)) {
      return category.toLowerCase();
    }
  }

  return 'other';
}

router.get('/files', validateGoogleToken, async (req, res) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: req.accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.list({
      pageSize: 1000,
      fields: 'files(id, name, mimeType, size, modifiedTime, md5Checksum, parents)'
    });
    
    // Categorize files and add additional metadata
    const categorizedFiles = response.data.files.map(file => ({
      ...file,
      category: categorizeFile(file),
      sizeInMB: file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : '0',
      sizeInGB: file.size ? (parseInt(file.size) / (1024 * 1024 * 1024)).toFixed(2) : '0',
      modifiedDate: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown',
      isLarge: file.size ? parseInt(file.size) > 100 * 1024 * 1024 : false, // > 100MB
      isOld: file.modifiedTime ? new Date(file.modifiedTime) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) : false
    }));

    // Generate file statistics
    const fileStats = {
      images: { count: 0, totalSize: 0 },
      videos: { count: 0, totalSize: 0 },
      audio: { count: 0, totalSize: 0 },
      documents: { count: 0, totalSize: 0 },
      other: { count: 0, totalSize: 0 }
    };

    for (const file of categorizedFiles) {
      const category = file.category;
      const size = parseInt(file.size || 0);
      
      if (fileStats[category]) {
        fileStats[category].count++;
        fileStats[category].totalSize += size;
      }
    }

    // Convert sizes to readable format
    for (const category in fileStats) {
      fileStats[category].totalSizeMB = (fileStats[category].totalSize / (1024 * 1024)).toFixed(2);
      fileStats[category].totalSizeGB = (fileStats[category].totalSize / (1024 * 1024 * 1024)).toFixed(2);
    }

    res.json({
      files: categorizedFiles,
      stats: fileStats,
      summary: {
        totalFiles: categorizedFiles.length,
        totalSize: (categorizedFiles.reduce((sum, f) => sum + parseInt(f.size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
      }
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    
    // Handle token expiration
    if (err.code === 401) {
      res.status(401).json({ 
        action: 'redirect_to_auth',
        authUrl: '/auth/google',
        error: 'Token expired. Please re-authenticate.'
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  }
});

module.exports = router;
