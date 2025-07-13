// Background Service Worker for GitHub Issue AI Summarizer
importScripts('src/utils/auth.js', 'src/utils/llm.js');

class BackgroundManager {
  constructor() {
    this.auth = new GitHubAuth();
    this.llm = new LLMSummarizer();
    this.currentIssue = null;
    this.currentComments = [];
    this.init();
  }

  // Initialize background script
  init() {
    this.setupMessageHandlers();
    this.setupContextMenus();
    this.initializeLLM();
  }

  // Initialize LLM
  async initializeLLM() {
    await this.llm.initialize();
  }

  // Setup message handlers
  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  // Handle messages from content script and popup
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'ISSUE_DETECTED':
          await this.handleIssueDetected(message.data);
          sendResponse({ success: true });
          break;

        case 'COMMENTS_EXTRACTED':
          await this.handleCommentsExtracted(message.data);
          sendResponse({ success: true });
          break;

        case 'GENERATE_SUMMARY':
          const summary = await this.generateSummary(message.data);
          sendResponse({ success: true, summary });
          break;

        case 'AUTHENTICATE':
          const authResult = await this.auth.authenticate();
          sendResponse(authResult);
          break;

        case 'CHECK_AUTH':
          const isAuthenticated = await this.auth.isAuthenticated();
          const userInfo = isAuthenticated ? await this.auth.getStoredUserInfo() : null;
          sendResponse({ isAuthenticated, userInfo });
          break;

        case 'LOGOUT':
          await this.auth.logout();
          sendResponse({ success: true });
          break;

        case 'SET_API_KEY':
          await this.llm.setApiKey(message.apiKey);
          sendResponse({ success: true });
          break;

        case 'GET_CURRENT_ISSUE':
          sendResponse({ issue: this.currentIssue, comments: this.currentComments });
          break;

        case 'FETCH_ISSUE_DATA':
          const issueData = await this.fetchIssueData(message.owner, message.repo, message.number);
          sendResponse({ success: true, data: issueData });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Handle issue detection
  async handleIssueDetected(issueData) {
    this.currentIssue = issueData;
    console.log('Issue detected:', issueData);
    
    // Update badge
    chrome.action.setBadgeText({
      text: '●',
      tabId: arguments[1]?.tab?.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#28a745'
    });
  }

  // Handle comments extraction
  async handleCommentsExtracted(comments) {
    this.currentComments = comments;
    console.log('Comments extracted:', comments.length);
  }

  // Generate AI summary
  async generateSummary(data) {
    if (!this.llm.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please set it in the extension popup.');
    }

    const { issue, comments } = data;
    
    // Ensure we have fresh data
    if (issue) {
      this.currentIssue = issue;
    }
    if (comments) {
      this.currentComments = comments;
    }

    // Generate summaries
    const [issueSummary, commentsSummary] = await Promise.all([
      this.llm.summarizeIssue(this.currentIssue),
      this.llm.summarizeComments(this.currentComments)
    ]);

    return {
      issue: issueSummary,
      comments: commentsSummary
    };
  }

  // Fetch issue data from GitHub API
  async fetchIssueData(owner, repo, number) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
    
    try {
      const issueData = await this.auth.makeAuthenticatedRequest(url);
      
      // Fetch comments
      const commentsUrl = `${url}/comments`;
      const comments = await this.auth.makeAuthenticatedRequest(commentsUrl);
      
      return {
        issue: issueData,
        comments: comments
      };
    } catch (error) {
      console.error('Error fetching issue data:', error);
      throw error;
    }
  }

  // Setup context menus
  setupContextMenus() {
    chrome.contextMenus.create({
      id: 'summarize-issue',
      title: 'Summarize Issue with AI',
      contexts: ['page'],
      documentUrlPatterns: ['https://github.com/*/issues/*']
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'summarize-issue') {
        chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_SUMMARY_FROM_CONTEXT' });
      }
    });
  }
}

// Initialize background manager
const backgroundManager = new BackgroundManager();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('GitHub Issue AI Summarizer installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: 'src/popup/popup.html'
    });
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('github.com')) {
    // Reset badge when navigating away from issues
    if (!tab.url.includes('/issues/')) {
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url?.includes('github.com/') && tab.url?.includes('/issues/')) {
      chrome.action.setBadgeText({
        text: '●',
        tabId: activeInfo.tabId
      });
    }
  });
});
