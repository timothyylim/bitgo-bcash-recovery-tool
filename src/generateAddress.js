const _ = require('lodash')
const bitcoin = require('./bitcoinCash')
const index = require('./index')

// address derivation path constants
const RECEIVE_CHAIN_P2SH = 0
const CHANGE_CHAIN_P2SH = 1

module.exports = function ({ hdNodes, path, threshold, network }) {
  let signatureThreshold = 2

  if (_.isInteger(threshold)) {
    if (signatureThreshold <= 0) {
      throw new Error('threshold has to be positive')
    }
    signatureThreshold = threshold
  }

  const pathRegex = new RegExp(`\^/(${RECEIVE_CHAIN_P2SH}|${CHANGE_CHAIN_P2SH})/\\d+$`)
  if (!path.match(pathRegex)) {
    throw new Error('unsupported path: ' + path)
  }

  let rootKeys
  if (Array.isArray(hdNodes)) {
    rootKeys = hdNodes
  }

  const derivedKeys = rootKeys.map(function (hdnode) {
    let derivationPath = path
    if (!derivationPath.startsWith('m')) {
      // all derivation paths need to start with m, but path may already contain that
      derivationPath = `m/0/0${derivationPath}`
    }
    var hdPath = bitcoin.hdPath(hdnode)
    return hdPath.deriveKey(derivationPath)
  })

  const pathComponents = path.split('/')
  const normalizedPathComponents = _.map(pathComponents, (component) => {
    if (component && component.length > 0) {
      return parseInt(component)
    }
  })
  const pathDetails = _.filter(normalizedPathComponents, _.isInteger)

  const addressDetails = {
    chainPath: path,
    path: path,
    chain: pathDetails[0],
    index: pathDetails[1]
  }

  // redeem script
  const inputScript = bitcoin.script.multisig.output.encode(signatureThreshold, derivedKeys.map(k => k.getPublicKeyBuffer()))
  // reddeem script hash
  const inputScriptHash = bitcoin.crypto.hash160(inputScript)

  let outputScript = bitcoin.script.scriptHash.output.encode(inputScriptHash)

  // Build the address object
  addressDetails.redeemScript = inputScript.toString('hex')
  addressDetails.outputScript = outputScript.toString('hex')
  addressDetails.address = bitcoin.address.fromOutputScript(outputScript, network)
  addressDetails.userKey = derivedKeys[0]
  addressDetails.backupKey = derivedKeys[1]

  if (path === '/0/0') {
    index.updateConsole('Now deriving wallet ID...')
    index.updateConsole('============================================================')
    index.updateConsole('The wallet ID detected was: ' + addressDetails.address)
    index.updateConsole('============================================================')
  }

  return addressDetails
}
