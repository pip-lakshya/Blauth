const fs = require('fs/promises');
const path = require('path');

class VerificationRequestStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async readRequests() {
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

    return requests;
  }

  async findByRequestId(requestId) {
    const requests = await this.readRequests();
    return requests.find((request) => request.requestId === requestId) || null;
  }

  async save(verificationRequest) {
    const requests = await this.readRequests();

    requests.push(verificationRequest);
    await this.writeRequests(requests);
  }

  async update(verificationRequest) {
    const requests = await this.readRequests();
    const requestIndex = requests.findIndex((request) => request.requestId === verificationRequest.requestId);

    if (requestIndex === -1) {
      throw new Error('Verification request does not exist.');
    }

    requests[requestIndex] = verificationRequest;
    await this.writeRequests(requests);
  }

  async writeRequests(requests) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(requests, null, 2), 'utf8');
  }
}

function getVerificationRequestStore() {
  const defaultPath = path.resolve(__dirname, '../../data/verification-requests.json');
  return new VerificationRequestStore(process.env.VERIFICATION_REQUEST_DATA_FILE || defaultPath);
}

module.exports = { getVerificationRequestStore, VerificationRequestStore };
