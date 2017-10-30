const Promise = require('bluebird')
const sjcl = require('sjcl')
const index = require('./index')

const validateKeys = function (coin, {walletPassphrase, userKey, backupKey, bitgoKey, recoveryDestination}) {
  const keys = []

  return Promise.try(() => {
    return validatePassphraseKey(coin, userKey, walletPassphrase)
  })
  .then(key => {
    index.updateConsole('Successfully decrypted and parsed user key with xpub: ')
    index.updateConsole(userKey + '\n')
    keys.push(key)
    try {
      if (!backupKey.startsWith('xprv')) {
        backupKey = sjcl.decrypt(walletPassphrase, backupKey)
      }
      const backupHDNode = coin.HDNode.fromBase58(backupKey)
      index.updateConsole('Successfully decrypted and parsed backup key with xpub: ')
      index.updateConsole(backupKey + '\n')
      keys.push(backupHDNode)
    } catch (e) {
      throw new Error('Failed to decrypt backup key with passcode - try again!')
    }

    try {
      const bitgoHDNode = coin.HDNode.fromBase58(bitgoKey)
      index.updateConsole('Successfully parsed bitgo xpub: ')
      index.updateConsole(bitgoKey + '\n')
      keys.push(bitgoHDNode)
    } catch (e) {
      throw new Error('Failed to parse bitgo xpub!')
    }

    if (!coin.isValidAddress(recoveryDestination)) {
      throw new Error('Invalid destination address!')
    }

    index.updateConsole('Successfully parsed destination address: ')
    index.updateConsole(recoveryDestination + '\n')
    return keys
  })
}

const validatePassphraseKey = (coin, userKey, passphrase) => {
  try {
    if (!userKey.startsWith('xprv')) {
      userKey = sjcl.decrypt(passphrase, userKey)
    }
    const userHDNode = coin.HDNode.fromBase58(userKey)
    return Promise.resolve(userHDNode)
  } catch (e) {
    throw new Error('Failed to decrypt user key with passcode - try again!')
  }
}

module.exports = validateKeys
