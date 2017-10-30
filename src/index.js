const axios = require('axios')
const _ = require('lodash')
const Promise = require('bluebird')
const bitcoin = require('bcashjs-lib')

const Bch = require('./coins/bch')
const initiateRecovery = require('./initiateRecovery')
const collectUnspents = require('./collectUnspents')
const craftTransaction = require('./craftTransaction')
const verifyTransaction = require('./verifyTransaction')

const NETWORK = bitcoin.networks.bitcoin
let UNSPENTS_TOTAL = 0
let FEE_AMOUNT = 0
let SEND_AMOUNT = 0
let RECEIVE_ADDRESS = ''
let TRANSACTION_HEX = ''

const updateConsole = (message) => {
  $('#console').val($('#console').val() + '\n' + message)
}

const setKeyCardInputDisableProperties = state => {
  $('#boxa').prop('disabled', state)
  $('#boxb').prop('disabled', state)
  $('#boxc').prop('disabled', state)
  $('#passphrase').prop('disabled', state)
  $('#destinationAddress').prop('disabled', state)
  $('#btnStartRecovery').prop('disabled', state)
}

const checkFields = () => {
  return Promise.try(() => {
    if (!$('#passphrase').val()) {
      throw new Error('Please enter your wallet password in the "Wallet passcode" field')
    }
    if (!$('#boxa').val()) {
      throw new Error('Please enter your Private Key')
    }
    if (!$('#boxb').val()) {
      throw new Error('Please enter your Backup Key')
    }
    if (!$('#boxc').val()) {
      throw new Error('Please enter your BitGo Key')
    }
    if (!$('#destinationAddress').val()) {
      throw new Error('Please enter your destination address')
    }
    return {
      walletPassphrase: $('#passphrase').val().trim(),
      userKey: $('#boxa').val().trim(),
      backupKey: $('#boxb').val().trim(),
      bitgoKey: $('#boxc').val().trim(),
      recoveryDestination: $('#destinationAddress').val().trim()
    }
  })
}

const recover = () => {
  $('#console').val('Starting recovery... \n')
  setKeyCardInputDisableProperties(true)
  checkFields()
  .then(params => {
    RECEIVE_ADDRESS = params.recoveryDestination
    return initiateRecovery(new Bch(), params)
  })
  .then(keys => {
    return collectUnspents(keys)
  })
  .then(unspents => {
    UNSPENTS_TOTAL = _.sumBy(unspents, unspent => unspent.amount)
    return craftTransaction(unspents, RECEIVE_ADDRESS)
  })
  .then(transactionHex => {
    TRANSACTION_HEX = transactionHex
    return verifyTransaction(transactionHex, UNSPENTS_TOTAL)
  })
  .then(({sendAmount, feeAmount, receiveAddress}) => {
    SEND_AMOUNT = sendAmount
    FEE_AMOUNT = feeAmount
    RECEIVE_ADDRESS = receiveAddress
    updateConsole('Please verify the transaction. If it is acceptable, type the following message in the field below to acknowledge you understand the effects of continuing with recovery.\n\n')
    updateConsole('I agree to send ' + SEND_AMOUNT + ' BCH with a fee of ' + FEE_AMOUNT + ' BCH to address ' + RECEIVE_ADDRESS + '\n')
    $('#sendSection').show(1000)
  })
  .catch(error => {
    updateConsole(error)
    updateConsole('Recovery stopped')
    setKeyCardInputDisableProperties(false)
  })
}

const sendTransaction = () => {
  const userMessage = $('#message').val()
  if (userMessage !== 'I agree to send ' + SEND_AMOUNT + ' BCH with a fee of ' + FEE_AMOUNT + ' BCH to address ' + RECEIVE_ADDRESS) {
    updateConsole('Incorrect acknowledgement message! Type the correct message, BCH amounts and receive address to continue with recovery\n')
  } else {
    axios.post('http://blockdozer.com/insight-api/tx/send', {rawtx: TRANSACTION_HEX})
    .then(response => {
      updateConsole('Transaction sent! Once the transaction is confirmed, check ' + RECEIVE_ADDRESS + ' to make sure your coin has arrived')
      updateConsole("Thank you for using BitGo's recovery tool!\n")
      updateConsole('Transaction ID: ' + JSON.stringify(response.data.txid))
      setKeyCardInputDisableProperties(false)
    })
    .catch(error => {
      updateConsole('Error sending transaction: ' + error.response.data)
      setKeyCardInputDisableProperties(false)
    })
  }
}

document.getElementById('btnStartRecovery').addEventListener('click', recover, false)
document.getElementById('btnSendTransaction').addEventListener('click', sendTransaction, false)

module.exports.updateConsole = updateConsole
module.exports.NETWORK = NETWORK
