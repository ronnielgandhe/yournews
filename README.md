# YourNews

Get the news you want, minus the noise.

## Overview

YourNews is a personalized news application that allows you to extract topics from your interests and get a filtered RSS feed from Reuters based on those topics.

## Architecture

- **Server** (`/server`): Express.js backend with REST API
- **Web** (`/web`): Next.js frontend application

## Features

### Server Endpoints

- `GET /health` - Health check endpoint
- `POST /topics` - Extract topics from free text input
- `GET /feed` - Fetch Reuters RSS feed, filter by topics, and return grouped results

### Web Application

- Textarea input for describing your interests
- "Extract Topics" button to analyze your text and identify key topics
- "Fetch Feed" button to get personalized news based on your topics
- Grouped news headlines with title, source, and date

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd yournews
   ```

2. **Set up and run the server**
   ```bash
   cd server
   npm install
   npm start
   ```
   The server will run on `http://localhost:3001`

3. **Set up and run the web application** (in a new terminal)
   ```bash
   cd web
   npm install
   npm run dev
   ```
   The web application will run on `http://localhost:3000`

4. **Open your browser**
   Navigate to `http://localhost:3000` to use the application

### Development

For development with auto-reload:

**Server:**
```bash
cd server
npm install -g nodemon  # if not already installed
npm run dev
```

**Web:**
```bash
cd web
npm run dev
```

## Usage

1. **Enter your interests**: In the textarea, describe topics you're interested in (e.g., "artificial intelligence, climate change, technology")

2. **Extract topics**: Click "Extract Topics" to analyze your text and identify key terms

3. **Get your feed**: Click "Fetch Feed" to retrieve news articles from Reuters filtered by your topics

4. **Browse results**: Articles are grouped by relevance:
   - **Highly Relevant**: Articles matching multiple topics
   - **Somewhat Relevant**: Articles matching one topic
   - **Other News**: Additional articles from the feed

## API Documentation

### POST /topics
Extract topics from free text.

**Request:**
```json
{
  "freeText": "I'm interested in artificial intelligence and machine learning"
}
```

**Response:**
```json
{
  "topics": ["artificial", "intelligence", "machine", "learning"]
}
```

### GET /feed
Get filtered news feed.

**Response:**
```json
{
  "total": 15,
  "topics": ["artificial", "intelligence"],
  "groups": {
    "highly_relevant": [...],
    "somewhat_relevant": [...],
    "other": [...]
  }
}
```

## Technologies Used

- **Backend**: Express.js, rss-parser
- **Frontend**: Next.js, React
- **Data Source**: Reuters RSS Feed
