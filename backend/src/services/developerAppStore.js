const fs = require('fs/promises');
const path = require('path');

class DeveloperAppStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async readApps() {
    let apps = [];
    try {
      apps = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    if (!Array.isArray(apps)) {
      throw new Error('Developer application data store is invalid.');
    }

    return apps;
  }

  async save(app) {
    const apps = await this.readApps();
    apps.push(app);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(apps, null, 2), 'utf8');
  }

  async findByApiKey(apiKey) {
    const apps = await this.readApps();
    return apps.find((app) => app.apiKey === apiKey) || null;
  }
}

function getDeveloperAppStore() {
  const defaultPath = path.resolve(__dirname, '../../data/developer-apps.json');
  return new DeveloperAppStore(process.env.DEVELOPER_APP_DATA_FILE || defaultPath);
}

module.exports = { DeveloperAppStore, getDeveloperAppStore };
