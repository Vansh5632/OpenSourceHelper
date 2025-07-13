#!/bin/bash

# GitHub Issue AI Summarizer Setup Script

echo "🚀 Setting up GitHub Issue AI Summarizer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building extension..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up GitHub OAuth App at https://github.com/settings/developers"
echo "2. Update manifest.json with your GitHub Client ID"
echo "3. Update src/utils/auth.js with your credentials"
echo "4. Load the extension in Chrome from the 'dist' folder"
echo "5. Get your OpenAI API key from https://platform.openai.com/api-keys"
echo ""
echo "📖 For detailed instructions, see README.md"
