const axios = require('axios');

class GitHubRepoMapper {
  constructor(token, owner, repo) {
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
          'User-Agent': 'Repo-Mapper'
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
      console.error(`Error reading directory ${path}:`, error.message);
    }
  }
}

// Usage
const mapper = new GitHubRepoMapper('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', '0akd', 'coursemission');
mapper.getAllFiles().then(fileMap => {
  console.log(JSON.stringify(fileMap, null, 2));
});