const bitcoin = require('bcashjs-lib')
const index = require('../index')

function Bch() {
  this.network = index.NETWORK
}

Bch.prototype.HDNode = bitcoin.HDNode

Bch.prototype.isValidAddress = function(address) { //TODO: Why not arrows?
  const validVersions = [
    this.network.pubKeyHash,
    this.network.scriptHash
  ]

  let addressDetails
  try {
    addressDetails = bitcoin.address.fromBase58Check(address)
  } catch (e) {
    return false
  }

  // the address version needs to be among the valid ones
  return validVersions.indexOf(addressDetails.version) !== -1
}

module.exports = Bch
