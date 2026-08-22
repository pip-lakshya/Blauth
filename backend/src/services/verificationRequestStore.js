const fs = require('fs/promises');
const path = require('path');

class VerificationRequestStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async save(verificationRequest) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    let requests = [];
    try {
      const contents = await fs.readFile(this.filePath, 'utf8');
      requests = JSON.parse(contents);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    if (!Array.isArray(requests)) {
      throw new Error('Verification request data store is invalid.');
    }

    requests.push(verificationRequest);
    await fs.writeFile(this.filePath, JSON.stringify(requests, null, 2), 'utf8');
  }
}

function getVerificationRequestStore() {
  const defaultPath = path.resolve(__dirname, '../../data/verification-requests.json');
  return new VerificationRequestStore(process.env.VERIFICATION_REQUEST_DATA_FILE || defaultPath);
}

module.exports = { getVerificationRequestStore, VerificationRequestStore };
