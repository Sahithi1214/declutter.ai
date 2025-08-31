const TOKEN_KEY = 'googleToken';

export const tokenManager = {
  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Save token to localStorage
  saveToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Check if token exists
  hasToken: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Basic token validation (can be extended with actual API validation)
  isTokenValid: (token) => {
    if (!token) return false;
    
    // For now, we'll just check if the token exists
    // In a real app, you might want to validate the token with Google's API
    // or check if it has expired based on the expiration time
    return true;
  }
}; 