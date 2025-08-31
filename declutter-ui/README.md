# DeclutterPro - File Management App

A React-based file management application that helps users organize and declutter their files across multiple storage sources.

## Features

- **Dashboard**: Overview of storage usage and quick actions
- **Duplicate Detection**: Find and manage duplicate files
- **Multi-Storage Support**: Connect to local storage, Google Drive, and other cloud services
- **Persistent Authentication**: Google Drive connection status persists across browser sessions

## Google Drive Integration

### Token Persistence

The app automatically persists Google Drive authentication tokens in localStorage to maintain connection status across page refreshes and browser sessions.

#### How it works:

1. **Token Storage**: When a user successfully connects to Google Drive, the access token is stored in localStorage under the key `'googleToken'`
2. **Automatic Restoration**: On app startup, the token is automatically retrieved from localStorage and the connection status is restored
3. **Token Validation**: Basic token validation is performed on app startup to ensure stored tokens are still valid
4. **Manual Disconnection**: Users can manually disconnect from Google Drive, which removes the token from localStorage
5. **Error Handling**: If a token expires or becomes invalid, it's automatically removed and the user is prompted to reconnect

#### Token Management Utilities

The app includes a `tokenManager` utility (`src/utils/tokenManager.js`) that provides:

- `getToken()`: Retrieve token from localStorage
- `saveToken(token)`: Save token to localStorage
- `removeToken()`: Remove token from localStorage
- `hasToken()`: Check if token exists
- `isTokenValid(token)`: Basic token validation

### Security Considerations

- Tokens are stored in localStorage (client-side only)
- No sensitive data is sent to the server without proper authentication
- Tokens are automatically cleared when they expire or become invalid
- Users can manually disconnect to remove stored tokens

## Getting Started

1. Install dependencies: `npm install`
2. Start the development server: `npm start`
3. Connect to Google Drive using the "Connect Google Drive" button
4. Your connection status will persist across browser sessions

## Development

The app uses:
- React with hooks for state management
- Lucide React for icons
- Axios for API calls
- Google OAuth for Drive integration
