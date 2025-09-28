const axios = require('axios');
const express = require('express');
require('dotenv').config();

class GitHubRepoMapper {
  constructor(token, owner, repo) {
    if (!token) {
      throw new Error('GitHub token is required. Make sure GITHUB_TOKEN is set in your .env file');
    }
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.baseURL = 'https://api.github.com';
  }

  async getAllFiles() {
    const fileMap = {};
    await this._traverseDirectory('', fileMap);
    return fileMap;
  }

  async _traverseDirectory(path, fileMap) {
    try {
      const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `token ${this.token}`,
          'User-Agent': 'Repo-Mapper',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      for (const item of response.data) {
        if (item.type === 'file') {
          fileMap[item.path] = {
            name: item.name,
            path: item.path,
            url: item.html_url,
            download_url: item.download_url,
            size: item.size,
            sha: item.sha,
            type: item.type,
            encoding: item.encoding
          };
        } else if (item.type === 'dir') {
          await this._traverseDirectory(item.path, fileMap);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error.response?.status, error.message);
      throw error;
    }
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Safe usage with environment variable
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is not set');
  process.exit(1);
}

const mapper = new GitHubRepoMapper(token, '0akd', 'coursemission');

// API endpoint to get files
app.get('/files', async (req, res) => {
  try {
    console.log('Fetching files from GitHub...');
    const fileMap = await mapper.getAllFiles();
    
    res.json({
      success: true,
      count: Object.keys(fileMap).length,
      files: fileMap
    });
  } catch (error) {
    console.error('Error in /files endpoint:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'GitHub Repo Mapper API',
    endpoints: {
      '/': 'This information page',
      '/files': 'GET all files from the repository with full details',
      '/health': 'Health check endpoint'
    },
    repository: {
      owner: '0akd',
      repo: 'coursemission'
    },
    example: 'Visit http://localhost:3000/files to see all file objects'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🔗 Endpoints:`);
  console.log(`   • http://localhost:${PORT}/ - API info`);
  console.log(`   • http://localhost:${PORT}/files - All file objects`);
  console.log(`   • http://localhost:${PORT}/health - Health check`);
});

// Preload files on startup and log them to console
mapper.getAllFiles().then(fileMap => {
  const fileCount = Object.keys(fileMap).length;
  console.log('\n📁 PRELOADED FILES FROM GITHUB:');
  console.log(`📊 Total files found: ${fileCount}`);
  
  if (fileCount > 0) {
    console.log('\n📋 FILE LIST:');
    console.log('=' .repeat(50));
    
    Object.entries(fileMap).forEach(([path, fileInfo], index) => {
      console.log(`\n${index + 1}. ${path}`);
      console.log(`   📄 Name: ${fileInfo.name}`);
      console.log(`   🔗 URL: ${fileInfo.url}`);
      console.log(`   📏 Size: ${fileInfo.size} bytes`);
      console.log(`   🆔 SHA: ${fileInfo.sha.substring(0, 8)}...`);
      console.log(`   ⬇️  Download: ${fileInfo.download_url}`);
    });
    
    console.log('=' .repeat(50));
    
    // Also log the raw JSON object for debugging
    console.log('\n🔍 RAW FILE OBJECTS (JSON):');
    console.log(JSON.stringify(fileMap, null, 2));
  } else {
    console.log('❌ No files found in the repository');
  }
  
  console.log('\n✅ Server startup completed successfully!\n');
}).catch(error => {
  console.error('❌ Error during startup file preload:', error.message);
  console.error('Stack trace:', error.stack);
});