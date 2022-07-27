const LoomTruffleProvider = require('loom-truffle-provider')

const path = require('path')
const fs = require('fs')
const EXPECTING_FILE_ERROR = "Expecting either a private key or a mnemonic file. Refer to the README file for more details."
const { readFileSync } = require('fs')
const PrivateKeyProvider = require("truffle-privatekey-provider");

module.exports = {
  networks: {
    extdev: {
      provider: function () {
        const privateKey = fs.readFileSync(path.join(__dirname, 'caller_private_key'), 'utf-8')
        const chainId = 'extdev-plasma-us1'
        const writeUrl = 'wss://extdev-plasma-us1.dappchains.com/websocket'
        const readUrl = 'wss://extdev-plasma-us1.dappchains.com/queryws'
        return new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKey)
      },
      network_id: '9545242630824'
    },
    rinkeby: {
      provider: function () {
        if (!process.env.INFURA_API_KEY) {
          throw new Error("INFURA_API_KEY env var not set")
        }
        const mnemonicPath = path.join(__dirname, '../rinkeby_mnemonic')
        const privateKeyPath = path.join(__dirname, '../rinkeby_private_key')
        if (fs.existsSync(privateKeyPath)) {
          const privateKey = readFileSync(path.join(__dirname, '../rinkeby_private_key'), 'utf-8')
          return new PrivateKeyProvider(privateKey, `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`, 0, 10)
        } else if (fs.existsSync(mnemonicPath)) {
          const mnemonic = readFileSync(path.join(__dirname, 'rinkeby_mnemonic'), 'utf-8')
          return new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`, 0, 10)
        } else {
          throw new Error(EXPECTING_FILE_ERROR)
        }
      },
      network_id: 4,
      gasPrice: 15000000001,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: '0.8.0'
    }
  }
}
