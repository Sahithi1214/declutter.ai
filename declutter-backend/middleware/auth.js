const axios = require('axios');

// Middleware to validate Google OAuth token
const validateGoogleToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing or invalid Authorization header',
      action: 'redirect_to_auth',
      authUrl: '/auth/google'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Test the token by making a simple API call
    await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Token is valid, proceed
    req.accessToken = token;
    next();
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Session expired. Please log in again.',
        action: 'redirect_to_auth',
        authUrl: '/auth/google'
      });
    } else {
      return res.status(500).json({ 
        error: 'Token validation failed',
        details: error.message
      });
    }
  }
};

module.exports = { validateGoogleToken }; 