# GitHub Issue AI Summarizer

A Chrome Extension that uses AI to automatically summarize GitHub issues and comments, making it easier to understand complex discussions and prioritize work.

## ✨ Features

- **🤖 AI-Powered Summarization**: Uses OpenAI's GPT models to generate concise summaries of GitHub issues and comments
- **🔐 GitHub OAuth Integration**: Secure authentication with GitHub to access private repositories
- **📊 Smart Analysis**: Automatically detects priority levels, technical details, and action items
- **💭 Comment Analysis**: Summarizes discussion threads and identifies key decisions
- **🎯 Auto-Detection**: Automatically detects when you're viewing a GitHub issue
- **📱 Modern UI**: Clean, responsive interface that matches GitHub's design language

## 🚀 Installation

### Prerequisites

1. **OpenAI API Key**: Get your API key from [OpenAI](https://platform.openai.com/api-keys)
2. **GitHub OAuth App**: Create a GitHub OAuth App for authentication
3. **Node.js**: Version 16 or higher

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vansh5632/OpenSourceHelper.git
   cd OSShelper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure GitHub OAuth**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in the application details:
     - Application name: `GitHub Issue AI Summarizer`
     - Homepage URL: `https://github.com/Vansh5632/OpenSourceHelper`
     - Authorization callback URL: `https://YOUR_EXTENSION_ID.chromiumapp.org/`
   - Copy the Client ID and Client Secret
   - Update `src/utils/auth.js` with your credentials

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## 🔧 Configuration

### GitHub OAuth Setup

1. Update `manifest.json` with your GitHub OAuth Client ID:
   ```json
   "oauth2": {
     "client_id": "YOUR_GITHUB_CLIENT_ID",
     "scopes": ["repo", "read:user"]
   }
   ```

2. Update `src/utils/auth.js` with your credentials:
   ```javascript
   this.clientId = 'YOUR_GITHUB_CLIENT_ID';
   // Note: Client secret should be handled by your backend for security
   ```

### OpenAI API Key

1. Open the extension popup
2. Sign in with GitHub
3. Enter your OpenAI API key in the configuration section
4. Select your preferred AI model (GPT-3.5 Turbo, GPT-4, etc.)

## 🎯 Usage

1. **Navigate to any GitHub issue** in your browser
2. **Click the "AI Summary" button** that appears in the issue header
3. **View the generated summary** in the popup or inline modal
4. **Use the extension popup** for additional controls and settings

### Extension Features

- **Auto-detection**: Automatically detects GitHub issues and extracts data
- **One-click summarization**: Generate summaries with a single click
- **Popup interface**: Full-featured popup with authentication and settings
- **Context menu**: Right-click context menu for quick access
- **Badge indicator**: Shows when you're on a supported GitHub issue page

## 🏗️ Project Structure

```
OSShelper/
├── src/
│   ├── background/
│   │   └── worker.js          # Background service worker
│   ├── content/
│   │   └── content.js         # Content script for GitHub pages
│   ├── popup/
│   │   ├── popup.html         # Extension popup UI
│   │   ├── popup.css          # Popup styling
│   │   └── popup.js           # Popup functionality
│   └── utils/
│       ├── auth.js            # GitHub OAuth handler
│       └── llm.js             # OpenAI LLM integration
├── public/
│   └── icon.svg               # Extension icon
├── manifest.json              # Extension manifest
├── package.json               # Dependencies and scripts
├── webpack.config.js          # Build configuration
└── README.md                  # This file
```

## 🔒 Security & Privacy

- **Local Storage**: API keys are stored locally in Chrome's secure storage
- **No Data Collection**: No user data is collected or transmitted to third parties
- **Secure Authentication**: Uses GitHub's OAuth 2.0 flow for secure authentication
- **HTTPS Only**: All API communications use HTTPS encryption

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development build with watch mode
- `npm run build` - Build for production
- `npm test` - Run tests (placeholder)

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development mode**
   ```bash
   npm run dev
   ```

3. **Load extension in Chrome**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select the `dist` folder

4. **Make changes and reload**
   - Edit source files
   - Webpack will automatically rebuild
   - Reload the extension in Chrome

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the GPT API
- [GitHub](https://github.com/) for the platform and API
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) documentation
- [LangChain](https://langchain.com/) for AI integration patterns

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Vansh5632/OpenSourceHelper/issues) page
2. Create a new issue with detailed information
3. Include Chrome version, extension version, and steps to reproduce

## 🔄 Updates

- **v1.0.0**: Initial release with core functionality
- Auto-detection of GitHub issues
- AI-powered summarization
- GitHub OAuth integration
- Modern UI with popup interface

---

**Made with ❤️ by the OpenSourceHelper team**
