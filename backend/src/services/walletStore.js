const fs = require('fs/promises');
const path = require('path');

class WalletStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async save(wallet) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    let wallets = [];
    try {
      const contents = await fs.readFile(this.filePath, 'utf8');
      wallets = JSON.parse(contents);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    if (!Array.isArray(wallets)) {
      throw new Error('Wallet data store is invalid.');
    }

    wallets.push(wallet);
    await fs.writeFile(this.filePath, JSON.stringify(wallets, null, 2), 'utf8');
  }
}

function getWalletStore() {
  const defaultPath = path.resolve(__dirname, '../../data/wallets.json');
  return new WalletStore(process.env.WALLET_DATA_FILE || defaultPath);
}

module.exports = { getWalletStore, WalletStore };
