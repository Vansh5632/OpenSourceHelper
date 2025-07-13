// GitHub OAuth Authentication Handler
class GitHubAuth {
  constructor() {
    this.clientId = 'YOUR_GITHUB_CLIENT_ID'; // Replace with your GitHub OAuth App Client ID
    this.redirectUri = chrome.identity.getRedirectURL();
    this.scopes = 'repo,read:user';
  }

  // Generate GitHub OAuth URL
  getAuthUrl() {
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('scope', this.scopes);
    authUrl.searchParams.append('response_type', 'code');
    return authUrl.toString();
  }

  // Initiate GitHub OAuth flow
  async authenticate() {
    try {
      const authUrl = this.getAuthUrl();
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      // Extract authorization code from response URL
      const urlParams = new URL(responseUrl).searchParams;
      const code = urlParams.get('code');

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      // Store token securely
      await this.storeToken(tokenResponse.access_token);
      
      // Get user info
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      await this.storeUserInfo(userInfo);

      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: 'YOUR_GITHUB_CLIENT_SECRET', // This should be handled by your backend
        code: code
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return await response.json();
  }

  // Get user information
  async getUserInfo(accessToken) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'GitHub-Issue-Summarizer'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  // Store access token securely
  async storeToken(token) {
    await chrome.storage.secure.set({ 'github_token': token });
  }

  // Store user information
  async storeUserInfo(userInfo) {
    await chrome.storage.local.set({ 'github_user': userInfo });
  }

  // Get stored token
  async getStoredToken() {
    const result = await chrome.storage.secure.get('github_token');
    return result.github_token;
  }

  // Get stored user info
  async getStoredUserInfo() {
    const result = await chrome.storage.local.get('github_user');
    return result.github_user;
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const token = await this.getStoredToken();
    if (!token) return false;

    try {
      // Verify token is still valid
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'GitHub-Issue-Summarizer'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Logout
  async logout() {
    await chrome.storage.secure.remove('github_token');
    await chrome.storage.local.remove('github_user');
  }

  // Make authenticated GitHub API request
  async makeAuthenticatedRequest(url, options = {}) {
    const token = await this.getStoredToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers = {
      'Authorization': `token ${token}`,
      'User-Agent': 'GitHub-Issue-Summarizer',
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubAuth;
} else {
  window.GitHubAuth = GitHubAuth;
}
