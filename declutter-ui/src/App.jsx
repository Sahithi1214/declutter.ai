import axios from 'axios';
import React, { useState, useRef, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { tokenManager } from './utils/tokenManager';

import { 
  Upload, 
  HardDrive, 
  Cloud, 
  PieChart, 
  Trash2, 
  Download,
  Search,
  Filter,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Users,
  Star
} from 'lucide-react';

// Utility function to make authenticated requests with automatic redirect handling
const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    const token = tokenManager.getToken();
    const response = await axios({
      url,
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response;
  } catch (error) {
    if (error.response?.status === 401) {
      const errorData = error.response.data;
      
      // Check if the server wants us to redirect to auth
      if (errorData.action === 'redirect_to_auth') {
        console.log('Session expired, redirecting to login...');
        
        // Store the current page to redirect back after login
        localStorage.setItem('redirectAfterLogin', window.location.pathname);
        
        // Clear the expired token
        tokenManager.removeToken();
        
        // Redirect to the auth URL
        window.location.href = errorData.authUrl;
        return;
      }
    }
    throw error;
  }
};

// Handle redirect after successful login
const handleLoginRedirect = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  
  if (accessToken) {
    // Store tokens
    tokenManager.saveToken(accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    
    // Redirect back to the original page if there was one
    const redirectPath = localStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectPath;
    } else {
      // Default redirect to home page
      window.location.href = '/';
    }
  }
};

const FileClutterApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [googleDriveSubTab, setGoogleDriveSubTab] = useState('overview');
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState('local');
  const [files, setFiles] = useState([]);
  const [scanResults, setScanResults] = useState({
    duplicates: [],
    largeFiles: [],
    oldFiles: [],
  });
  
  const fileInputRef = useRef(null);
  const [googleToken, setGoogleToken] = useState(() => {
    // Initialize from localStorage on component mount
    return tokenManager.getToken();
  });

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = tokenManager.getToken();
    if (token && tokenManager.isTokenValid(token)) {
      setIsAuthenticated(true);
    }
  }, []);

  // Save token to localStorage whenever it changes
  useEffect(() => {
    tokenManager.saveToken(googleToken);
  }, [googleToken]);

  // Check token validity on component mount
  useEffect(() => {
    const storedToken = tokenManager.getToken();
    if (storedToken && !tokenManager.isTokenValid(storedToken)) {
      tokenManager.removeToken();
      setGoogleToken(null);
    }
  }, []);

  // Handle login redirect when the page loads
  useEffect(() => {
    if (window.location.search.includes('access_token')) {
      handleLoginRedirect();
    }
  }, []);

  // Update Google Drive stats when scan results are available
  useEffect(() => {
    if (googleToken && scanResults && scanResults.storage) {
      // Use the accurate storage data from the API
      storageStats.googleDrive.total = scanResults.storage.total;
      storageStats.googleDrive.used = scanResults.storage.used;
      storageStats.googleDrive.free = scanResults.storage.free;
      storageStats.googleDrive.duplicates = scanResults.storage.duplicates;
      storageStats.googleDrive.largeFiles = scanResults.storage.largeFiles;
      storageStats.googleDrive.oldFiles = scanResults.storage.oldFiles;
      storageStats.googleDrive.usagePercentage = scanResults.storage.usagePercentage;
    }
  }, [scanResults, googleToken]);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    onSuccess: (tokenResponse) => {
      console.log('Google login success:', tokenResponse);
      setGoogleToken(tokenResponse.access_token);
      setIsAuthenticated(true);
    },
    onError: (err) => console.error('Google login error:', err),
  });

  // Function to disconnect Google Drive
  const disconnectGoogleDrive = () => {
    setGoogleToken(null);
  };

  // Function to check if token is still valid (basic check)
  const isTokenValid = (token) => {
    return tokenManager.isTokenValid(token);
  };

  // Storage stats organized by source
  const storageStats = {
    local: {
      name: 'Local Storage',
      connected: true,
      total: '512 GB',
      used: '387 GB',
      free: '125 GB',
      duplicates: '0 GB',
      largeFiles: '0 GB',
      oldFiles: '0 GB',
      usagePercentage: 75.6
    },
    googleDrive: {
      name: 'Google Drive',
      connected: !!googleToken,
      total: '15 GB',
      used: '0 GB',
      free: '15 GB',
      duplicates: '0 GB',
      largeFiles: '0 GB',
      oldFiles: '0 GB',
      usagePercentage: 0
    },
    dropbox: {
      name: 'Dropbox',
      connected: false,
      total: '2 GB',
      used: '0 GB',
      free: '2 GB',
      duplicates: '0 GB',
      largeFiles: '0 GB',
      oldFiles: '0 GB',
      usagePercentage: 0
    }
  };

  // Get connected storage sources
  const connectedStorages = Object.entries(storageStats).filter(([key, stats]) => stats.connected);

  // Calculate totals across all connected sources
  const totalStats = connectedStorages.reduce((acc, [key, stats]) => {
    return {
      total: acc.total + parseFloat(stats.total),
      used: acc.used + parseFloat(stats.used),
      free: acc.free + parseFloat(stats.free),
      duplicates: acc.duplicates + parseFloat(stats.duplicates),
      largeFiles: acc.largeFiles + parseFloat(stats.largeFiles),
      oldFiles: acc.oldFiles + parseFloat(stats.oldFiles)
    };
  }, { total: 0, used: 0, free: 0, duplicates: 0, largeFiles: 0, oldFiles: 0 });

  const duplicateGroups = scanResults.duplicates;
  const largeFiles = scanResults.largeFiles;
  const oldFiles = scanResults.oldFiles;

  const getFileCategories = () => {
    const counts = {
      Images: 0,
      Videos: 0,
      Audio: 0,
      Documents: 0
    };
    const sizes = {
      Images: 0,
      Videos: 0,
      Audio: 0,
      Documents: 0
    };
  
    const allFiles = [
      ...scanResults.duplicates.flatMap(g => g.files),
      ...scanResults.largeFiles,
      ...scanResults.oldFiles
    ];
  
    for (const file of allFiles) {
      const mime = file.mimeType || '';
      const size = parseInt(file.size || 0);
  
      if (mime.startsWith('image/')) {
        counts.Images++; sizes.Images += size;
      } else if (mime.startsWith('video/')) {
        counts.Videos++; sizes.Videos += size;
      } else if (mime.startsWith('audio/')) {
        counts.Audio++; sizes.Audio += size;
      } else if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) {
        counts.Documents++; sizes.Documents += size;
      }
    }
  
    return [
      { icon: Image, label: 'Images', count: counts.Images, size: (sizes.Images / (1024 * 1024)).toFixed(1) + ' MB', color: 'blue' },
      { icon: Video, label: 'Videos', count: counts.Videos, size: (sizes.Videos / (1024 * 1024)).toFixed(1) + ' MB', color: 'purple' },
      { icon: Music, label: 'Audio', count: counts.Audio, size: (sizes.Audio / (1024 * 1024)).toFixed(1) + ' MB', color: 'green' },
      { icon: FileText, label: 'Documents', count: counts.Documents, size: (sizes.Documents / (1024 * 1024)).toFixed(1) + ' MB', color: 'orange' }
    ];
  };

  // Function to get file categories from scan results
  const getFileCategoriesFromStats = (fileStats) => {
    if (!fileStats) return [];
    
    return [
      { icon: Image, label: 'Images', count: fileStats.images?.count || 0, size: (fileStats.images?.totalSizeMB || 0) + ' MB', color: 'blue' },
      { icon: Video, label: 'Videos', count: fileStats.videos?.count || 0, size: (fileStats.videos?.totalSizeMB || 0) + ' MB', color: 'purple' },
      { icon: Music, label: 'Audio', count: fileStats.audio?.count || 0, size: (fileStats.audio?.totalSizeMB || 0) + ' MB', color: 'green' },
      { icon: FileText, label: 'Documents', count: fileStats.documents?.count || 0, size: (fileStats.documents?.totalSizeMB || 0) + ' MB', color: 'orange' }
    ];
  };

  // [
  //   {
  //     id: 1,
  //     name: 'vacation-photo.jpg',
  //     count: 4,
  //     size: '2.4 MB',
  //     totalSize: '9.6 MB',
  //     locations: ['Downloads', 'Pictures', 'Desktop', 'Google Drive']
  //   },
  //   {
  //     id: 2,
  //     name: 'presentation.pptx',
  //     count: 3,
  //     size: '12.8 MB',
  //     totalSize: '38.4 MB',
  //     locations: ['Documents', 'Desktop', 'Google Drive']
  //   },
  //   {
  //     id: 3,
  //     name: 'song.mp3',
  //     count: 5,
  //     size: '4.2 MB',
  //     totalSize: '21.0 MB',
  //     locations: ['Music', 'Downloads', 'Desktop', 'OneDrive', 'iTunes']
  //   }
  // ];

  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files);
    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  const startScan = async (storageType = 'all') => {
    if (storageType === 'googleDrive' && !googleToken) {
      alert("Please connect Google Drive first.");
      return;
    }

    // Check if token is still valid for Google Drive
    if (storageType === 'googleDrive' && !isTokenValid(googleToken)) {
      setGoogleToken(null);
      alert("Your Google Drive connection has expired. Please reconnect.");
      return;
    }
  
    setIsScanning(true);
    setScanProgress(0);
  
    try {
      const response = await makeAuthenticatedRequest('http://localhost:5000/scan', {
        method: 'POST',
        data: { storageType }
      });
  
      console.log('Scan Results:', response.data);
      setScanResults(response.data.results);
  
    } catch (error) {
      console.error('Error scanning:', error.response?.data || error.message);
      
      // Handle token expiration error
      if (error.response?.status === 401) {
        setGoogleToken(null);
        alert("Your Google Drive connection has expired. Please reconnect.");
      }
    } finally {
      setScanProgress(100);
      setIsScanning(false);
    }
  };
  
  // Utility function to get drive files with automatic redirect handling
  const getDriveFiles = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:5000/drive/files', {
        method: 'GET'
      });
      
      if (response.status === 200) {
        const files = response.data;
        console.log('Drive files:', files);
        return files;
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      throw error;
    }
  };

  const StorageCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg border border-${color}-500/20`}>
          <Icon className={`h-6 w-6 text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  const LocalStorageView = () => {
    const stats = storageStats.local;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HardDrive className="h-8 w-8 text-gray-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Local Storage</h2>
            <span className="ml-3 px-3 py-1 bg-green-500/10 text-green-400 text-sm rounded-full border border-green-500/20">Connected</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => startScan('local')}
              disabled={isScanning}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan Local Storage'}
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">
              <Trash2 className="h-4 w-4 mr-2" />
              Clean Duplicates
            </button>
          </div>
        </div>

        {/* Storage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StorageCard icon={Database} title="Total Storage" value={stats.total} color="blue" />
          <StorageCard icon={HardDrive} title="Used Space" value={stats.used} subtitle={`${stats.usagePercentage}% used`} color="orange" />
          <StorageCard icon={Trash2} title="Duplicates Found" value={stats.duplicates} subtitle="Potential savings" color="red" />
          <StorageCard icon={CheckCircle} title="Free Space" value={stats.free} subtitle={`${(100 - stats.usagePercentage).toFixed(1)}% available`} color="green" />
        </div>

        {/* Usage Progress */}
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Storage Usage</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Used Space</span>
              <span className="font-medium text-white">{stats.used} / {stats.total}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${stats.usagePercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{stats.free} available</p>
          </div>
        </div>

        {/* File Categories */}
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">File Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getFileCategoriesFromStats(scanResults.fileStats).map((category, idx) => {
              const Icon = category.icon;
              return (
                <div key={idx} className="p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-6 w-6 text-${category.color}-400`} />
                    <span className="text-sm font-medium text-white">{category.count}</span>
                  </div>
                  <p className="text-sm text-gray-400">{category.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{category.size}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scan Progress */}
        {isScanning && (
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Scanning Local Storage</h3>
              <span className="text-sm text-gray-400">{Math.round(scanProgress)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="progress-bar h-2 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">Analyzing files and detecting duplicates...</p>
          </div>
        )}
      </div>
    );
  };

  const GoogleDriveView = () => {
    const stats = storageStats.googleDrive;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Cloud className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Google Drive</h2>
            {googleToken ? (
              <span className="ml-3 px-3 py-1 bg-green-500/10 text-green-400 text-sm rounded-full border border-green-500/20">Connected</span>
            ) : (
              <span className="ml-3 px-3 py-1 bg-yellow-500/10 text-yellow-400 text-sm rounded-full border border-yellow-500/20">Not Connected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {googleToken ? (
              <>
                <button 
                  onClick={() => startScan('googleDrive')}
                  disabled={isScanning}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Scan Google Drive'}
                </button>
                <button 
                  onClick={disconnectGoogleDrive}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Disconnect
                </button>
              </>
            ) : (
              <button 
                onClick={login}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Connect Google Drive
              </button>
            )}
          </div>
        </div>

        {googleToken ? (
          <>
            {/* Sub-tabs for Google Drive */}
            <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800">
              <div className="border-b border-gray-800">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: PieChart },
                    { id: 'duplicates', label: 'Duplicates', icon: Trash2 },
                    { id: 'largeFiles', label: 'Large Files', icon: Database },
                    { id: 'oldFiles', label: 'Old Files', icon: Clock }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setGoogleDriveSubTab(tab.id)}
                      className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                        googleDriveSubTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <tab.icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {googleDriveSubTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Storage Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StorageCard icon={Database} title="Total Storage" value={stats.total} color="blue" />
                      <StorageCard icon={HardDrive} title="Used Space" value={stats.used} subtitle={`${stats.usagePercentage}% used`} color="orange" />
                      <StorageCard icon={Trash2} title="Duplicates Found" value={stats.duplicates} subtitle="Potential savings" color="red" />
                      <StorageCard icon={CheckCircle} title="Free Space" value={stats.free} subtitle={`${(100 - stats.usagePercentage).toFixed(1)}% available`} color="green" />
                    </div>

                    {/* Usage Progress */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4">Storage Usage</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Used Space</span>
                          <span className="font-medium text-white">{stats.used} / {stats.total}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${stats.usagePercentage}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-400">{stats.free} available</p>
                      </div>
                    </div>

                    {/* File Categories */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4">File Categories</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {getFileCategoriesFromStats(scanResults.fileStats).map((category, idx) => {
                          const Icon = category.icon;
                          return (
                            <div key={idx} className="p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-all duration-300 cursor-pointer transform hover:scale-105">
                              <div className="flex items-center justify-between mb-2">
                                <Icon className={`h-6 w-6 text-${category.color}-400`} />
                                <span className="text-sm font-medium text-white">{category.count}</span>
                              </div>
                              <p className="text-sm text-gray-400">{category.label}</p>
                              <p className="text-xs text-gray-500 mt-1">{category.size}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scan Progress */}
                    {isScanning && (
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">Scanning Google Drive</h3>
                          <span className="text-sm text-gray-400">{Math.round(scanProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="progress-bar h-2 rounded-full transition-all duration-300"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">Analyzing files and detecting duplicates...</p>
                      </div>
                    )}
                  </div>
                )}

                {googleDriveSubTab === 'duplicates' && <DuplicatesView />}
                {googleDriveSubTab === 'largeFiles' && <LargeFilesView />}
                {googleDriveSubTab === 'oldFiles' && <OldFilesView />}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800 text-center">
            <Cloud className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connect Google Drive</h3>
            <p className="text-gray-400 mb-6">Connect your Google Drive to start monitoring storage usage and finding duplicates</p>
            <button 
              onClick={login}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 mx-auto transition-all duration-300"
            >
              <Cloud className="h-5 w-5 mr-2" />
              Connect Google Drive
            </button>
          </div>
        )}
      </div>
    );
  };

  const DropboxView = () => {
    const stats = storageStats.dropbox;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Cloud className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Dropbox</h2>
            <span className="ml-3 px-3 py-1 bg-yellow-500/10 text-yellow-400 text-sm rounded-full border border-yellow-500/20">Not Connected</span>
          </div>
          <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
            <Cloud className="h-4 w-4 mr-2" />
            Connect Dropbox
          </button>
        </div>

        <div className="bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800 text-center">
          <Cloud className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect Dropbox</h3>
          <p className="text-gray-400 mb-6">Connect your Dropbox to start monitoring storage usage and finding duplicates</p>
          <button className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 mx-auto transition-all duration-300">
            <Cloud className="h-5 w-5 mr-2" />
            Connect Dropbox
          </button>
        </div>
      </div>
    );
  };

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Overall Storage Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StorageCard 
            icon={Database} 
            title="Total Storage" 
            value={`${totalStats.total.toFixed(1)} GB`} 
            subtitle={`${connectedStorages.length} sources connected`}
            color="blue" 
          />
          <StorageCard 
            icon={HardDrive} 
            title="Used Space" 
            value={`${totalStats.used.toFixed(1)} GB`} 
            subtitle={`${((totalStats.used / totalStats.total) * 100).toFixed(1)}% used`}
            color="orange" 
          />
          <StorageCard 
            icon={Trash2} 
            title="Duplicates Found" 
            value={`${totalStats.duplicates.toFixed(1)} GB`} 
            subtitle="Potential savings"
            color="red" 
          />
          <StorageCard 
            icon={CheckCircle} 
            title="Free Space" 
            value={`${totalStats.free.toFixed(1)} GB`} 
            subtitle={`${((totalStats.free / totalStats.total) * 100).toFixed(1)}% available`}
            color="green" 
          />
        </div>
      </div>

      {/* Storage Sources Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Storage Sources</h3>
        {connectedStorages.map(([key, stats]) => (
          <div 
            key={key} 
            className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => setActiveTab(key)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {key === 'local' && <HardDrive className="h-6 w-6 text-gray-400 mr-3" />}
                {key === 'googleDrive' && <Cloud className="h-6 w-6 text-blue-400 mr-3" />}
                {key === 'dropbox' && <Cloud className="h-6 w-6 text-blue-400 mr-3" />}
                <h4 className="text-lg font-semibold text-white">{stats.name}</h4>
                <span className="ml-2 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Connected</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Usage</p>
                <p className="text-lg font-semibold text-white">{stats.usagePercentage}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-lg font-semibold text-white">{stats.total}</p>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <p className="text-sm text-gray-400">Used</p>
                <p className="text-lg font-semibold text-orange-400">{stats.used}</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-gray-400">Duplicates</p>
                <p className="text-lg font-semibold text-red-400">{stats.duplicates}</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-gray-400">Free</p>
                <p className="text-lg font-semibold text-green-400">{stats.free}</p>
              </div>
            </div>
            
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.usagePercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">Click to view detailed management</p>
          </div>
        ))}
        
        {/* Not Connected Sources */}
        {Object.entries(storageStats).filter(([key, stats]) => !stats.connected).map(([key, stats]) => (
          <div 
            key={key} 
            className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800 opacity-60 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => setActiveTab(key)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {key === 'local' && <HardDrive className="h-6 w-6 text-gray-500 mr-3" />}
                {key === 'googleDrive' && <Cloud className="h-6 w-6 text-gray-500 mr-3" />}
                {key === 'dropbox' && <Cloud className="h-6 w-6 text-gray-500 mr-3" />}
                <h4 className="text-lg font-semibold text-gray-400">{stats.name}</h4>
                <span className="ml-2 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20">Not Connected</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">Connect to start monitoring this storage source</p>
            <button 
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(key);
              }}
            >
              Connect {stats.name}
            </button>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => startScan('all')}
            disabled={isScanning}
            className="flex items-center justify-center p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all duration-300 disabled:opacity-50 transform hover:scale-105"
          >
            <RefreshCw className={`h-5 w-5 text-blue-400 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="font-medium text-blue-400">
              {isScanning ? 'Scanning...' : 'Start Full Scan'}
            </span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all duration-300 transform hover:scale-105">
            <Trash2 className="h-5 w-5 text-red-400 mr-2" />
            <span className="font-medium text-red-400">Clean Duplicates</span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-green-500/10 hover:bg-green-500/20 rounded-lg border border-green-500/20 transition-all duration-300 transform hover:scale-105">
            <Download className="h-5 w-5 text-green-400 mr-2" />
            <span className="font-medium text-green-400">Export Report</span>
          </button>
        </div>
      </div>

      {/* Scan Progress */}
      {isScanning && (
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Scanning Progress</h3>
            <span className="text-sm text-gray-400">{Math.round(scanProgress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="progress-bar h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">Analyzing files and detecting duplicates...</p>
        </div>
      )}
    </div>
  );

  const DuplicatesView = () => {
    const duplicateGroups = scanResults.duplicates || [];
    const totalSavings = duplicateGroups.reduce((sum, group) => {
      return sum + (group.totalSize || group.files?.reduce((gSum, f) => gSum + parseInt(f.size || 0), 0) || 0);
    }, 0);
    const totalSavingsGB = (totalSavings / (1024 * 1024 * 1024)).toFixed(2);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Duplicate Files</h2>
            <p className="text-gray-400 mt-1">Found {duplicateGroups.length} duplicate groups • Potential savings: {totalSavingsGB} GB</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-800 transition-all duration-300">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </button>
          </div>
        </div>

        {duplicateGroups.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
            <Trash2 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Duplicates Found</h3>
            <p className="text-gray-400 mb-6">Run a scan to discover duplicate files in your storage</p>
            <button 
              onClick={() => startScan('googleDrive')}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 mx-auto transition-all duration-300"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Start Scan
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Duplicate Groups</h3>
                  <p className="text-sm text-gray-400">Select files to delete and free up space</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-400">{duplicateGroups.reduce((acc, group) => acc + (group.files?.length || 0) - 1, 0)}</p>
                  <p className="text-sm text-gray-400">files to remove</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {duplicateGroups.map((group, groupIndex) => {
                const files = group.files || [];
                const groupSize = group.totalSize || files.reduce((sum, f) => sum + parseInt(f.size || 0), 0);
                const savingsPerFile = groupSize - parseInt(files[0]?.size || 0);
                const savingsMB = (savingsPerFile / (1024 * 1024)).toFixed(1);

                return (
                  <div key={groupIndex} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-blue-500 mr-3" />
                        <div>
                          <h4 className="font-medium text-white">{group.name}</h4>
                          <p className="text-sm text-gray-400">
                            {files.length} copies • {(parseInt(files[0]?.size || 0) / (1024 * 1024)).toFixed(1)} MB each • {(groupSize / (1024 * 1024)).toFixed(1)} MB total
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-red-500/10 text-red-400 text-sm rounded-full border border-red-500/20">
                          Save {savingsMB} MB
                        </span>
                        <button className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      {files.map((file, fileIndex) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              name={`group-${groupIndex}`} 
                              className="mr-3 border-gray-600 bg-gray-700 text-blue-500"
                              defaultChecked={fileIndex === 0}
                            />
                            <div>
                              <p className="text-sm font-medium text-white">{file.name}</p>
                              <p className="text-xs text-gray-400">
                                {(parseInt(file.size || 0) / (1024 * 1024)).toFixed(1)} MB • Modified {new Date(file.modifiedTime).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {fileIndex === 0 ? (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">Keep</span>
                          ) : (
                            <button className="text-red-400 hover:text-red-300 text-xs transition-colors">Remove</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const LargeFilesView = () => {
    const largeFiles = scanResults.largeFiles || [];
    const totalSize = largeFiles.reduce((sum, file) => sum + parseInt(file.size || 0), 0);
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Large Files</h2>
            <p className="text-gray-400 mt-1">Found {largeFiles.length} large files • Total size: {totalSizeGB} GB</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-800 transition-all duration-300">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </button>
          </div>
        </div>

        {largeFiles.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
            <Database className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Large Files Found</h3>
            <p className="text-gray-400 mb-6">Run a scan to discover large files in your storage</p>
            <button 
              onClick={() => startScan('googleDrive')}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 mx-auto transition-all duration-300"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Start Scan
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Large Files (&gt;100MB)</h3>
                  <p className="text-sm text-gray-400">Review and manage your largest files</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-400">{largeFiles.length}</p>
                  <p className="text-sm text-gray-400">files found</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {largeFiles.map((file, index) => {
                const fileSize = parseInt(file.size || 0);
                const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
                const sizeGB = (fileSize / (1024 * 1024 * 1024)).toFixed(2);
                const displaySize = fileSize > 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`;

                return (
                  <div key={file.id || index} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-blue-500 mr-3" />
                        <div className="flex items-center">
                          {file.category === 'images' && <Image className="h-5 w-5 text-blue-400 mr-3" />}
                          {file.category === 'videos' && <Video className="h-5 w-5 text-purple-400 mr-3" />}
                          {file.category === 'audio' && <Music className="h-5 w-5 text-green-400 mr-3" />}
                          {file.category === 'documents' && <FileText className="h-5 w-5 text-orange-400 mr-3" />}
                          {(!file.category || file.category === 'other') && <Database className="h-5 w-5 text-gray-400 mr-3" />}
                          <div>
                            <h4 className="font-medium text-white">{file.name}</h4>
                            <p className="text-sm text-gray-400">
                              {displaySize} • {file.category || 'Other'} • Modified {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-sm rounded-full border border-orange-500/20">
                          {displaySize}
                        </span>
                        <button className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const OldFilesView = () => {
    const oldFiles = scanResults.oldFiles || [];
    const totalSize = oldFiles.reduce((sum, file) => sum + parseInt(file.size || 0), 0);
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Old Files</h2>
            <p className="text-gray-400 mt-1">Found {oldFiles.length} old files • Total size: {totalSizeGB} GB</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-800 transition-all duration-300">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </button>
          </div>
        </div>

        {oldFiles.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
            <Clock className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Old Files Found</h3>
            <p className="text-gray-400 mb-6">Run a scan to discover old files in your storage</p>
            <button 
              onClick={() => startScan('googleDrive')}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 mx-auto transition-all duration-300"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Start Scan
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Old Files (&gt;1 year)</h3>
                  <p className="text-sm text-gray-400">Review and manage files not modified in over a year</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-400">{oldFiles.length}</p>
                  <p className="text-sm text-gray-400">files found</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {oldFiles.map((file, index) => {
                const fileSize = parseInt(file.size || 0);
                const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
                const sizeGB = (fileSize / (1024 * 1024 * 1024)).toFixed(2);
                const displaySize = fileSize > 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`;
                const daysOld = file.daysOld || Math.floor((Date.now() - new Date(file.modifiedTime).getTime()) / (24 * 60 * 60 * 1000));

                return (
                  <div key={file.id || index} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-blue-500 mr-3" />
                        <div className="flex items-center">
                          {file.category === 'images' && <Image className="h-5 w-5 text-blue-400 mr-3" />}
                          {file.category === 'videos' && <Video className="h-5 w-5 text-purple-400 mr-3" />}
                          {file.category === 'audio' && <Music className="h-5 w-5 text-green-400 mr-3" />}
                          {file.category === 'documents' && <FileText className="h-5 w-5 text-orange-400 mr-3" />}
                          {(!file.category || file.category === 'other') && <Database className="h-5 w-5 text-gray-400 mr-3" />}
                          <div>
                            <h4 className="font-medium text-white">{file.name}</h4>
                            <p className="text-sm text-gray-400">
                              {displaySize} • {file.category || 'Other'} • Modified {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-sm rounded-full border border-yellow-500/20">
                          {daysOld} days old
                        </span>
                        <button className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Landing Page Component
  const LandingPage = () => (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            DeclutterPro
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={login}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6 gradient-text-animate animate-pulse">
              Declutter Your Digital Life
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in-up">
              Automatically find and remove duplicate files, large files, and old files across all your storage platforms. 
              Reclaim valuable space with intelligent decluttering.
            </p>
            <div className="flex items-center justify-center space-x-6 mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <button 
                onClick={login}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 hover-lift animate-pulse-glow"
              >
                <span>Start Free Scan</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose DeclutterPro?</h2>
            <p className="text-gray-400 text-lg">Powerful features to keep your digital storage clean and organized</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Scan thousands of files in seconds with our optimized algorithms"
              },
              {
                icon: Shield,
                title: "Safe & Secure",
                description: "Your files are never uploaded to our servers. All processing happens locally."
              },
              {
                icon: BarChart3,
                title: "Smart Analytics",
                description: "Get detailed insights into your storage usage and potential savings"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 hover-lift animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 animate-float">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "1M+", label: "Files Scanned" },
              { number: "500GB+", label: "Space Recovered" },
              { number: "50K+", label: "Happy Users" },
              { number: "99.9%", label: "Accuracy Rate" }
            ].map((stat, index) => (
              <div key={index} className="animate-fade-in-up hover-lift" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-4xl font-bold gradient-text-animate mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">DeclutterPro</span>
          </div>
          <p className="text-gray-400">© 2024 DeclutterPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );

  // Main App Component
  const MainApp = () => (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  DeclutterPro
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Settings className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: PieChart },
                { id: 'local', label: 'Local Storage', icon: HardDrive },
                { id: 'googleDrive', label: 'Google Drive', icon: Cloud },
                { id: 'dropbox', label: 'Dropbox', icon: Cloud }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'local' && <LocalStorageView />}
            {activeTab === 'googleDrive' && <GoogleDriveView />}
            {activeTab === 'dropbox' && <DropboxView />}
          </div>
        </div>
      </div>
    </div>
  );

  return isAuthenticated ? <MainApp /> : <LandingPage />;
};

export default FileClutterApp;