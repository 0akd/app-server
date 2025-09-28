const axios = require('axios');
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
    }
  }
}

// Safe usage with environment variable
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is not set');
  process.exit(1);
}

const mapper = new GitHubRepoMapper(token, '0akd', 'coursemission');
mapper.getAllFiles().then(fileMap => {
  console.log('Found files:', Object.keys(fileMap).length);
  console.log(JSON.stringify(fileMap, null, 2));
}).catch(error => {
  console.error('Error:', error.message);
});