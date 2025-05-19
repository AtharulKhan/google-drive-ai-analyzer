
# Google Drive AI Analyzer

This application allows you to select documents from Google Drive (Docs, Sheets, Slides, PDFs) and analyze them using AI through OpenRouter.

## Setup Instructions

### 1. Google Cloud Console Setup

1. Create a new Google Cloud Project (or use an existing one)
2. Enable the following APIs:
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Slides API
   - Google Picker API

3. Configure OAuth consent screen:
   - Set Application type to "External"
   - Add required scopes:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/spreadsheets.readonly`
     - `https://www.googleapis.com/auth/presentations.readonly`
   - Add your domain(s) under Authorized domains (including localhost for development)

4. Create OAuth 2.0 credentials:
   - Go to Credentials → Create OAuth Client ID → Web application
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for Vite development)
     - Your production URL
   - Add authorized redirect URIs (same as origins)
   - Copy the Client ID for the next step

### 2. Environment Setup

Create a `.env.local` file in the project root with the following:

```
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_OPENROUTER_API_KEY=sk-or-xxxxx...
```

### 3. Installation and Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Features

- Authenticate with Google OAuth
- Select individual files or folders from Google Drive
- Extract text content from Docs, Sheets, Slides, and PDFs
- Process multiple files together
- Send to OpenRouter AI for analysis (e.g., summarization)
- Display AI-generated results in markdown format

## Limitations

- Maximum character limit per file (default: 200,000 chars)
- Limited number of files processed from a folder (configurable)
- Only processes text-based content (no image analysis)
- Requires internet connection for Google API and OpenRouter API access

## Adding OpenRouter API Key

Get an OpenRouter API key from [OpenRouter](https://openrouter.ai/) and add it to your `.env.local` file.

---

This project is built with React, Vite, TypeScript, and shadcn/ui.
