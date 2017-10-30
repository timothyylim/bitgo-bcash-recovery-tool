const _ = require('lodash')
const bitcoin = require('bcashjs-lib')
const index = require('./index')

module.exports = function (unspents, destinationAddress) {
  const network = index.NETWORK
  if (unspents.length === 0) {
    throw new Error('No BCH to recover')
  }

  const sigHashType = bitcoin.Transaction.SIGHASH_ALL | bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143

  const totalInputAmount = _.sumBy(unspents, unspent => unspent.satoshis)
  index.updateConsole('Total number of inputs: ' + unspents.length)
  index.updateConsole('Total amount found in inputs: ' + _.sumBy(unspents, unspent => unspent.amount) + ' BCH \n')

  // Construct the transaction
  index.updateConsole('Now constructing tx... ')
  let transactionBuilder = new bitcoin.TransactionBuilder(network)
  transactionBuilder.enableBitcoinCash(true)
  transactionBuilder.setVersion(2)

  let txSigningRequest = {}

  // Add inputs
  txSigningRequest.inputs = []
  unspents.forEach(unspent => {
    transactionBuilder.addInput(unspent.txid, unspent.vout, 0xffffffff)
    txSigningRequest.inputs.push({
      chainPath: unspent.addressDetails.chainPath,
      redeemScript: unspent.addressDetails.redeemScript
    })
  })

  // Add output
  // assume 34 bytes for the single output and 295 bytes for each tx input
  const approximateSize = new bitcoin.Transaction().toBuffer().length + 34 + (295 * unspents.length)
  const approximateFee = approximateSize * 100 // Hardcoded at 100 Satoshis per byte for now
  index.updateConsole('Using a default fee of 100 Satoshis per byte')
  index.updateConsole('Estimating transaction size to be ' + approximateSize + ' bytes, requiring fee of ' + approximateFee + ' satoshis \n')
  transactionBuilder.addOutput(destinationAddress, totalInputAmount - approximateFee)

  // Sign each unspent
  index.updateConsole('Signing tx...')

  const signUnspent = function (index, transactionBuilder, privKey, unspent) {
    transactionBuilder.sign(index, privKey, Buffer.from(unspent.addressDetails.redeemScript, 'hex'), sigHashType, unspent.satoshis)
  }

  let i = 0
  unspents.forEach(unspent => {
    const backupPrv = unspent.addressDetails.backupKey
    const userPrv = unspent.addressDetails.userKey
    backupPrv.network = network
    userPrv.network = network

    signUnspent(i, transactionBuilder, backupPrv, unspent)
    signUnspent(i, transactionBuilder, userPrv, unspent)
    i++
  })

  txSigningRequest.transactionHex = transactionBuilder.build().toBuffer().toString('hex')

  index.updateConsole('Raw TX: ' + txSigningRequest.transactionHex + '\n\n\n')
  index.updateConsole('Actual transaction size is ' + transactionBuilder.build().toBuffer().length + ' bytes.')

  return txSigningRequest.transactionHex
}
