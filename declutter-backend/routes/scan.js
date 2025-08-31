// routes/scan.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { validateGoogleToken } = require('../middleware/auth');

// File categorization constants
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

// Configuration for file detection
const CONFIG = {
  LARGE_FILE_THRESHOLD: 100 * 1024 * 1024, // 100MB
  OLD_FILE_DAYS: 365, // 1 year
  DUPLICATE_SIZE_THRESHOLD: 1024, // 1KB - only check files larger than this for duplicates
  MAX_FILES_TO_PROCESS: 1000
};

// Util to fetch files from Google Drive
async function fetchDriveFiles(accessToken) {
  const res = await axios.get('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      fields: 'files(id, name, size, modifiedTime, mimeType, parents, md5Checksum)',
      pageSize: CONFIG.MAX_FILES_TO_PROCESS,
    },
  });
  return res.data.files;
}

// Util to fetch Google Drive quota information
async function fetchDriveQuota(accessToken) {
  try {
    const res = await axios.get('https://www.googleapis.com/drive/v3/about', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        fields: 'storageQuota',
      },
    });
    return res.data.storageQuota;
  } catch (error) {
    console.error('Failed to fetch quota:', error);
    // Return default values if quota fetch fails
    return {
      limit: '16106127360', // 15GB in bytes
      usage: '0',
      usageInDrive: '0',
      usageInDriveTrash: '0'
    };
  }
}

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

// Enhanced duplicate detection using multiple strategies
function detectDuplicates(files) {
  const duplicates = [];
  
  // Strategy 1: MD5 checksum (most accurate for Google Drive)
  const md5Groups = new Map();
  const filesWithMd5 = files.filter(f => f.md5Checksum && f.size > CONFIG.DUPLICATE_SIZE_THRESHOLD);
  
  for (const file of filesWithMd5) {
    if (!md5Groups.has(file.md5Checksum)) {
      md5Groups.set(file.md5Checksum, []);
    }
    md5Groups.get(file.md5Checksum).push(file);
  }

  // Add MD5-based duplicates
  for (const [md5, group] of md5Groups) {
    if (group.length > 1) {
      duplicates.push({
        id: `md5_${md5}`,
        name: group[0].name,
        size: group[0].size,
        type: 'md5_match',
        files: group,
        totalSize: group.reduce((sum, f) => sum + parseInt(f.size || 0), 0)
      });
    }
  }

  // Strategy 2: Name + Size combination (for files without MD5)
  const nameSizeGroups = new Map();
  const filesWithoutMd5 = files.filter(f => !f.md5Checksum && f.size > CONFIG.DUPLICATE_SIZE_THRESHOLD);
  
  for (const file of filesWithoutMd5) {
    const key = `${file.name}-${file.size}`;
    if (!nameSizeGroups.has(key)) {
      nameSizeGroups.set(key, []);
    }
    nameSizeGroups.get(key).push(file);
  }

  // Add name+size-based duplicates
  for (const [key, group] of nameSizeGroups) {
    if (group.length > 1) {
      // Check if this group is already covered by MD5 detection
      const isAlreadyDetected = duplicates.some(d => 
        d.files.some(f => group.some(g => g.id === f.id))
      );
      
      if (!isAlreadyDetected) {
        duplicates.push({
          id: `name_size_${key}`,
          name: group[0].name,
          size: group[0].size,
          type: 'name_size_match',
          files: group,
          totalSize: group.reduce((sum, f) => sum + parseInt(f.size || 0), 0)
        });
      }
    }
  }

  return duplicates;
}

// Detect large files with configurable threshold
function detectLargeFiles(files) {
  return files
    .filter(f => f.size && parseInt(f.size) > CONFIG.LARGE_FILE_THRESHOLD)
    .map(f => ({
      ...f,
      sizeInMB: (parseInt(f.size) / (1024 * 1024)).toFixed(2),
      category: categorizeFile(f)
    }))
    .sort((a, b) => parseInt(b.size) - parseInt(a.size)); // Sort by size descending
}

// Detect old files with configurable threshold
function detectOldFiles(files) {
  const thresholdDate = new Date(Date.now() - CONFIG.OLD_FILE_DAYS * 24 * 60 * 60 * 1000);
  
  return files
    .filter(f => {
      if (!f.modifiedTime) return false;
      return new Date(f.modifiedTime) < thresholdDate;
    })
    .map(f => ({
      ...f,
      daysOld: Math.floor((Date.now() - new Date(f.modifiedTime).getTime()) / (24 * 60 * 60 * 1000)),
      category: categorizeFile(f)
    }))
    .sort((a, b) => new Date(a.modifiedTime) - new Date(b.modifiedTime)); // Sort by oldest first
}

// Generate file statistics by category
function generateFileStats(files) {
  const stats = {
    images: { count: 0, totalSize: 0 },
    videos: { count: 0, totalSize: 0 },
    audio: { count: 0, totalSize: 0 },
    documents: { count: 0, totalSize: 0 },
    other: { count: 0, totalSize: 0 }
  };

  for (const file of files) {
    const category = categorizeFile(file);
    const size = parseInt(file.size || 0);
    
    if (stats[category]) {
      stats[category].count++;
      stats[category].totalSize += size;
    }
  }

  // Convert sizes to readable format
  for (const category in stats) {
    stats[category].totalSizeMB = (stats[category].totalSize / (1024 * 1024)).toFixed(2);
    stats[category].totalSizeGB = (stats[category].totalSize / (1024 * 1024 * 1024)).toFixed(2);
  }

  return stats;
}

router.post('/', validateGoogleToken, async (req, res) => {
  try {
    const { storageType = 'googleDrive' } = req.body;
    
    if (storageType !== 'googleDrive') {
      return res.status(400).json({ error: 'Only Google Drive scanning is currently supported' });
    }

    // Fetch both files and quota information
    const [files, quota] = await Promise.all([
      fetchDriveFiles(req.accessToken),
      fetchDriveQuota(req.accessToken)
    ]);
    
    // Categorize all files
    const categorizedFiles = files.map(file => ({
      ...file,
      category: categorizeFile(file)
    }));

    // Generate file statistics
    const fileStats = generateFileStats(files);

    // Detect duplicates
    const duplicates = detectDuplicates(files);

    // Detect large files
    const largeFiles = detectLargeFiles(files);

    // Detect old files
    const oldFiles = detectOldFiles(files);

    // Calculate storage information from quota
    const totalLimit = parseInt(quota.limit || '16106127360'); // 15GB default
    const totalUsage = parseInt(quota.usage || '0');
    const totalFree = totalLimit - totalUsage;
    
    const totalLimitGB = (totalLimit / (1024 * 1024 * 1024)).toFixed(1);
    const totalUsageGB = (totalUsage / (1024 * 1024 * 1024)).toFixed(1);
    const totalFreeGB = (totalFree / (1024 * 1024 * 1024)).toFixed(1);
    const usagePercentage = ((totalUsage / totalLimit) * 100).toFixed(1);

    // Calculate potential savings
    const duplicateSavings = duplicates.reduce((sum, group) => {
      return sum + (group.totalSize - parseInt(group.files[0].size || 0));
    }, 0);
    const duplicateSavingsGB = (duplicateSavings / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
      results: {
        duplicates,
        largeFiles,
        oldFiles,
        fileStats,
        storage: {
          total: `${totalLimitGB} GB`,
          used: `${totalUsageGB} GB`,
          free: `${totalFreeGB} GB`,
          usagePercentage: parseFloat(usagePercentage),
          duplicates: `${duplicateSavingsGB} GB`,
          largeFiles: `${(largeFiles.reduce((sum, f) => sum + parseInt(f.size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`,
          oldFiles: `${(oldFiles.reduce((sum, f) => sum + parseInt(f.size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`
        },
        summary: {
          totalFiles: files.length,
          totalSize: totalUsageGB + ' GB',
          duplicateSavings: duplicateSavingsGB + ' GB',
          largeFilesCount: largeFiles.length,
          oldFilesCount: oldFiles.length,
          duplicateGroupsCount: duplicates.length
        }
      },
    });

  } catch (error) {
    console.error('Scan failed:', error.response?.data || error.message);
    
    // Handle token expiration
    if (error.response?.status === 401) {
      res.status(401).json({ 
        action: 'redirect_to_auth',
        authUrl: '/auth/google',
        error: 'Token expired. Please re-authenticate.'
      });
    } else if (error.response?.status === 403) {
      res.status(403).json({ 
        error: 'Insufficient permissions to access Google Drive.',
        details: error.response.data
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to scan Google Drive files',
        details: error.response?.data || error.message
      });
    }
  }
});

module.exports = router;
