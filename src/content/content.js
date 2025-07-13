// Content Script for GitHub Issue Detection and Data Extraction
class GitHubIssueDetector {
  constructor() {
    this.currentIssue = null;
    this.currentComments = [];
    this.observer = null;
    this.isProcessing = false;
  }

  // Initialize the detector
  init() {
    this.detectIssue();
    this.setupObserver();
    this.addSummaryButton();
  }

  // Detect if we're on a GitHub issue page
  detectIssue() {
    const url = window.location.href;
    const issueMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    
    if (issueMatch) {
      const [, owner, repo, issueNumber] = issueMatch;
      this.extractIssueData(owner, repo, issueNumber);
    }
  }

  // Setup mutation observer for dynamic content
  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new comments were added
          const hasNewComments = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.classList?.contains('js-comment') || node.querySelector?.('.js-comment'))
          );
          
          if (hasNewComments) {
            setTimeout(() => this.extractComments(), 1000);
          }
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Extract issue data from the page
  extractIssueData(owner, repo, issueNumber) {
    const issueData = {
      owner,
      repo,
      number: issueNumber,
      url: window.location.href,
      title: this.extractTitle(),
      body: this.extractBody(),
      labels: this.extractLabels(),
      state: this.extractState(),
      user: this.extractAuthor(),
      createdAt: this.extractCreatedAt(),
      updatedAt: this.extractUpdatedAt()
    };

    this.currentIssue = issueData;
    this.extractComments();
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'ISSUE_DETECTED',
      data: issueData
    });
  }

  // Extract issue title
  extractTitle() {
    const titleElement = document.querySelector('.js-issue-title, .gh-header-title .js-issue-title');
    return titleElement?.textContent?.trim() || '';
  }

  // Extract issue body
  extractBody() {
    const bodyElement = document.querySelector('.js-comment-body p, .comment-body p');
    return bodyElement?.textContent?.trim() || '';
  }

  // Extract labels
  extractLabels() {
    const labelElements = document.querySelectorAll('.js-issue-labels .IssueLabel');
    return Array.from(labelElements).map(label => ({
      name: label.textContent.trim(),
      color: label.style.backgroundColor
    }));
  }

  // Extract issue state
  extractState() {
    const stateElement = document.querySelector('.State');
    return stateElement?.textContent?.toLowerCase()?.includes('open') ? 'open' : 'closed';
  }

  // Extract issue author
  extractAuthor() {
    const authorElement = document.querySelector('.timeline-comment-header .author');
    return {
      login: authorElement?.textContent?.trim() || '',
      avatar_url: document.querySelector('.timeline-comment-avatar img')?.src || ''
    };
  }

  // Extract created date
  extractCreatedAt() {
    const timeElement = document.querySelector('.timeline-comment-header relative-time');
    return timeElement?.getAttribute('datetime') || '';
  }

  // Extract updated date
  extractUpdatedAt() {
    const timeElements = document.querySelectorAll('relative-time');
    return timeElements.length > 0 ? timeElements[timeElements.length - 1].getAttribute('datetime') : '';
  }

  // Extract comments
  extractComments() {
    const commentElements = document.querySelectorAll('.js-comment');
    this.currentComments = Array.from(commentElements).map((comment, index) => {
      const author = comment.querySelector('.author')?.textContent?.trim() || '';
      const body = comment.querySelector('.comment-body')?.textContent?.trim() || '';
      const timeElement = comment.querySelector('relative-time');
      const createdAt = timeElement?.getAttribute('datetime') || '';
      
      return {
        id: index,
        user: { login: author },
        body,
        created_at: createdAt
      };
    });

    // Notify background script about comments
    chrome.runtime.sendMessage({
      type: 'COMMENTS_EXTRACTED',
      data: this.currentComments
    });
  }

  // Add summary button to the page
  addSummaryButton() {
    // Check if button already exists
    if (document.querySelector('#ai-summary-btn')) {
      return;
    }

    const buttonContainer = document.querySelector('.gh-header-actions');
    if (!buttonContainer) {
      setTimeout(() => this.addSummaryButton(), 1000);
      return;
    }

    const summaryButton = document.createElement('button');
    summaryButton.id = 'ai-summary-btn';
    summaryButton.className = 'btn btn-sm';
    summaryButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/>
      </svg>
      AI Summary
    `;
    summaryButton.style.marginLeft = '8px';
    summaryButton.title = 'Generate AI Summary';

    summaryButton.addEventListener('click', () => {
      this.generateSummary();
    });

    buttonContainer.appendChild(summaryButton);
  }

  // Generate AI summary
  async generateSummary() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const button = document.querySelector('#ai-summary-btn');
    const originalText = button.innerHTML;
    
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="animate-spin">
        <path d="M8 0a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V0z"/>
      </svg>
      Processing...
    `;
    button.disabled = true;

    try {
      // Send request to generate summary
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_SUMMARY',
        data: {
          issue: this.currentIssue,
          comments: this.currentComments
        }
      });

      if (response.success) {
        this.displaySummary(response.summary);
      } else {
        this.showError(response.error);
      }
    } catch (error) {
      this.showError('Failed to generate summary');
      console.error('Summary generation error:', error);
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
      this.isProcessing = false;
    }
  }

  // Display summary in a modal
  displaySummary(summary) {
    this.removeSummaryModal();
    
    const modal = document.createElement('div');
    modal.id = 'ai-summary-modal';
    modal.className = 'ai-summary-modal';
    modal.innerHTML = `
      <div class="ai-summary-overlay">
        <div class="ai-summary-content">
          <div class="ai-summary-header">
            <h3>AI Summary</h3>
            <button class="ai-summary-close">&times;</button>
          </div>
          <div class="ai-summary-body">
            <div class="summary-section">
              <h4>Issue Summary</h4>
              <p>${summary.issue.summary}</p>
              
              <h4>Priority</h4>
              <span class="priority-badge priority-${summary.issue.priority}">${summary.issue.priority}</span>
              
              <h4>Key Technical Details</h4>
              <ul>
                ${summary.issue.technicalDetails.map(detail => `<li>${detail}</li>`).join('')}
              </ul>
              
              <h4>Action Items</h4>
              <ul>
                ${summary.issue.actionItems.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            
            <div class="summary-section">
              <h4>Comments Summary</h4>
              <p>${summary.comments.summary}</p>
              
              <h4>Key Points</h4>
              <ul>
                ${summary.comments.keyPoints.map(point => `<li>${point}</li>`).join('')}
              </ul>
              
              <h4>Sentiment</h4>
              <span class="sentiment-badge sentiment-${summary.comments.sentiment}">${summary.comments.sentiment}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .ai-summary-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
      }
      
      .ai-summary-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .ai-summary-content {
        background: white;
        border-radius: 8px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .ai-summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e1e4e8;
      }
      
      .ai-summary-header h3 {
        margin: 0;
        color: #24292e;
      }
      
      .ai-summary-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6a737d;
      }
      
      .ai-summary-body {
        padding: 20px;
      }
      
      .summary-section {
        margin-bottom: 24px;
      }
      
      .summary-section h4 {
        margin: 0 0 8px 0;
        color: #24292e;
      }
      
      .priority-badge, .sentiment-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .priority-low { background: #28a745; color: white; }
      .priority-medium { background: #ffc107; color: #212529; }
      .priority-high { background: #dc3545; color: white; }
      
      .sentiment-positive { background: #28a745; color: white; }
      .sentiment-negative { background: #dc3545; color: white; }
      .sentiment-neutral { background: #6c757d; color: white; }
      .sentiment-mixed { background: #17a2b8; color: white; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.ai-summary-close').addEventListener('click', () => {
      this.removeSummaryModal();
    });

    modal.querySelector('.ai-summary-overlay').addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.ai-summary-overlay')) {
        this.removeSummaryModal();
      }
    });
  }

  // Remove summary modal
  removeSummaryModal() {
    const modal = document.querySelector('#ai-summary-modal');
    if (modal) {
      modal.remove();
    }
  }

  // Show error message
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'flash flash-error';
    errorDiv.textContent = message;
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '10001';
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GitHubIssueDetector().init();
  });
} else {
  new GitHubIssueDetector().init();
}

// Handle navigation changes (GitHub uses pushState)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      new GitHubIssueDetector().init();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });
