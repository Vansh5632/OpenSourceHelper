// Popup JavaScript for GitHub Issue AI Summarizer
class PopupManager {
  constructor() {
    this.currentIssue = null;
    this.currentComments = [];
    this.isAuthenticated = false;
    this.userInfo = null;
    this.init();
  }

  // Initialize popup
  async init() {
    this.setupEventListeners();
    await this.checkAuthentication();
    await this.loadCurrentIssue();
    await this.loadConfiguration();
  }

  // Setup event listeners
  setupEventListeners() {
    // Authentication
    document.getElementById('login-btn').addEventListener('click', () => {
      this.handleLogin();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Configuration
    document.getElementById('save-api-key').addEventListener('click', () => {
      this.saveApiKey();
    });

    document.getElementById('model-select').addEventListener('change', (e) => {
      this.saveModel(e.target.value);
    });

    // Issue actions
    document.getElementById('summarize-btn').addEventListener('click', () => {
      this.generateSummary();
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refreshIssue();
    });
  }

  // Check authentication status
  async checkAuthentication() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      this.isAuthenticated = response.isAuthenticated;
      this.userInfo = response.userInfo;
      this.updateAuthUI();
    } catch (error) {
      console.error('Error checking authentication:', error);
    }
  }

  // Update authentication UI
  updateAuthUI() {
    const loginView = document.getElementById('login-view');
    const userView = document.getElementById('user-view');

    if (this.isAuthenticated && this.userInfo) {
      loginView.classList.add('hidden');
      userView.classList.remove('hidden');
      
      document.getElementById('user-avatar').src = this.userInfo.avatar_url;
      document.getElementById('user-name').textContent = this.userInfo.name || this.userInfo.login;
      document.getElementById('user-login').textContent = `@${this.userInfo.login}`;
    } else {
      loginView.classList.remove('hidden');
      userView.classList.add('hidden');
    }
  }

  // Handle login
  async handleLogin() {
    const loginBtn = document.getElementById('login-btn');
    const originalText = loginBtn.innerHTML;
    
    loginBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="animate-spin">
        <path d="M8 0a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V0z"/>
      </svg>
      Signing in...
    `;
    loginBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'AUTHENTICATE' });
      
      if (response.success) {
        this.isAuthenticated = true;
        this.userInfo = response.user;
        this.updateAuthUI();
        this.showStatus('Successfully signed in!', 'success');
      } else {
        this.showStatus(`Login failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showStatus('Login failed. Please try again.', 'error');
    } finally {
      loginBtn.innerHTML = originalText;
      loginBtn.disabled = false;
    }
  }

  // Handle logout
  async handleLogout() {
    try {
      await chrome.runtime.sendMessage({ type: 'LOGOUT' });
      this.isAuthenticated = false;
      this.userInfo = null;
      this.updateAuthUI();
      this.showStatus('Successfully signed out!', 'success');
    } catch (error) {
      this.showStatus('Logout failed. Please try again.', 'error');
    }
  }

  // Save API key
  async saveApiKey() {
    const apiKeyInput = document.getElementById('api-key');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.showStatus('Please enter an API key', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      this.showStatus('Please enter a valid OpenAI API key', 'error');
      return;
    }

    try {
      await chrome.runtime.sendMessage({ 
        type: 'SET_API_KEY', 
        apiKey: apiKey 
      });
      
      this.showStatus('API key saved successfully!', 'success');
      apiKeyInput.value = '';
    } catch (error) {
      this.showStatus('Failed to save API key', 'error');
    }
  }

  // Save model selection
  async saveModel(model) {
    try {
      await chrome.storage.local.set({ 'selected_model': model });
      this.showStatus(`Model changed to ${model}`, 'info');
    } catch (error) {
      this.showStatus('Failed to save model selection', 'error');
    }
  }

  // Load configuration
  async loadConfiguration() {
    try {
      const result = await chrome.storage.local.get(['selected_model']);
      if (result.selected_model) {
        document.getElementById('model-select').value = result.selected_model;
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  // Load current issue
  async loadCurrentIssue() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_ISSUE' });
      this.currentIssue = response.issue;
      this.currentComments = response.comments;
      this.updateIssueUI();
    } catch (error) {
      console.error('Error loading current issue:', error);
    }
  }

  // Update issue UI
  updateIssueUI() {
    const noIssueDiv = document.getElementById('no-issue');
    const issueDetailsDiv = document.getElementById('issue-details');

    if (this.currentIssue) {
      noIssueDiv.classList.add('hidden');
      issueDetailsDiv.classList.remove('hidden');
      
      document.getElementById('issue-title').textContent = this.currentIssue.title;
      document.getElementById('issue-author').textContent = `by ${this.currentIssue.user?.login || 'Unknown'}`;
      document.getElementById('issue-date').textContent = new Date(this.currentIssue.createdAt).toLocaleDateString();
      
      const stateElement = document.getElementById('issue-state');
      stateElement.textContent = this.currentIssue.state;
      stateElement.className = `state-badge ${this.currentIssue.state}`;
      
      this.updateLabels();
    } else {
      noIssueDiv.classList.remove('hidden');
      issueDetailsDiv.classList.add('hidden');
    }
  }

  // Update labels
  updateLabels() {
    const labelsContainer = document.getElementById('issue-labels');
    labelsContainer.innerHTML = '';
    
    if (this.currentIssue.labels && this.currentIssue.labels.length > 0) {
      this.currentIssue.labels.forEach(label => {
        const labelElement = document.createElement('span');
        labelElement.className = 'label';
        labelElement.textContent = label.name;
        labelElement.style.backgroundColor = `#${label.color || '666'}`;
        labelsContainer.appendChild(labelElement);
      });
    }
  }

  // Generate summary
  async generateSummary() {
    if (!this.currentIssue) {
      this.showStatus('No issue found. Please navigate to a GitHub issue.', 'error');
      return;
    }

    if (!this.isAuthenticated) {
      this.showStatus('Please sign in with GitHub first.', 'error');
      return;
    }

    const summarizeBtn = document.getElementById('summarize-btn');
    const originalText = summarizeBtn.innerHTML;
    
    summarizeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="animate-spin">
        <path d="M8 0a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V0z"/>
      </svg>
      Generating...
    `;
    summarizeBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_SUMMARY',
        data: {
          issue: this.currentIssue,
          comments: this.currentComments
        }
      });

      if (response.success) {
        this.displaySummary(response.summary);
        this.showStatus('Summary generated successfully!', 'success');
      } else {
        this.showStatus(`Failed to generate summary: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showStatus('Failed to generate summary. Please try again.', 'error');
      console.error('Summary generation error:', error);
    } finally {
      summarizeBtn.innerHTML = originalText;
      summarizeBtn.disabled = false;
    }
  }

  // Display summary
  displaySummary(summary) {
    const summarySection = document.getElementById('summary-section');
    const summaryContent = document.getElementById('summary-content');
    
    summaryContent.innerHTML = `
      <div class="summary-section">
        <h4>Issue Summary</h4>
        <p>${summary.issue.summary}</p>
        
        <h4>Priority</h4>
        <span class="priority-badge priority-${summary.issue.priority}">${summary.issue.priority}</span>
        
        ${summary.issue.technicalDetails.length > 0 ? `
          <h4>Technical Details</h4>
          <ul>
            ${summary.issue.technicalDetails.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${summary.issue.actionItems.length > 0 ? `
          <h4>Action Items</h4>
          <ul>
            ${summary.issue.actionItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${summary.issue.dependencies.length > 0 ? `
          <h4>Dependencies</h4>
          <ul>
            ${summary.issue.dependencies.map(dep => `<li>${dep}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      
      <div class="summary-section">
        <h4>Comments Summary</h4>
        <p>${summary.comments.summary}</p>
        
        ${summary.comments.keyPoints.length > 0 ? `
          <h4>Key Points</h4>
          <ul>
            ${summary.comments.keyPoints.map(point => `<li>${point}</li>`).join('')}
          </ul>
        ` : ''}
        
        <h4>Sentiment</h4>
        <span class="sentiment-badge sentiment-${summary.comments.sentiment}">${summary.comments.sentiment}</span>
        
        ${summary.comments.decisions.length > 0 ? `
          <h4>Decisions</h4>
          <ul>
            ${summary.comments.decisions.map(decision => `<li>${decision}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${summary.comments.outstandingQuestions.length > 0 ? `
          <h4>Outstanding Questions</h4>
          <ul>
            ${summary.comments.outstandingQuestions.map(question => `<li>${question}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
    
    summarySection.classList.remove('hidden');
  }

  // Refresh issue
  async refreshIssue() {
    const refreshBtn = document.getElementById('refresh-btn');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="animate-spin">
        <path d="M8 0a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V0z"/>
      </svg>
      Refreshing...
    `;
    refreshBtn.disabled = true;

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url?.includes('github.com') && tab.url?.includes('/issues/')) {
        // Reload the content script
        await chrome.tabs.reload(tab.id);
        
        // Wait a moment for the page to reload
        setTimeout(async () => {
          await this.loadCurrentIssue();
          this.showStatus('Issue refreshed successfully!', 'success');
        }, 2000);
      } else {
        this.showStatus('Please navigate to a GitHub issue page.', 'error');
      }
    } catch (error) {
      this.showStatus('Failed to refresh issue. Please try again.', 'error');
    } finally {
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }
  }

  // Show status message
  showStatus(message, type) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = 'status-message';
    }, 5000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ISSUE_UPDATED') {
    // Refresh the popup when issue is updated
    window.location.reload();
  }
});
