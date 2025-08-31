const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Step 1: Generate consent screen URL
router.get('/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    prompt: 'consent'
  });
  res.redirect(url);
});

// Step 2: Handle callback and send tokens
router.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Return both access and refresh tokens
    res.redirect(`${process.env.FRONTEND_URL}/?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`);
  } catch (err) {
    console.error('Error getting tokens:', err);
    res.status(500).send('Auth Failed');
  }
});

// Step 3: Refresh token endpoint
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    oauth2Client.setCredentials({
      refresh_token: refresh_token
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    res.json({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refresh_token
    });
  } catch (err) {
    console.error('Error refreshing token:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
