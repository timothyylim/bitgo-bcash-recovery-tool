const axios = require('axios')
const _ = require('lodash')

module.exports = (transactionHex, UNSPENTS_TOTAL) => {
  return axios.post('https://api.smartbit.com.au/v1/blockchain/decodetx/', {hex: transactionHex})
    .then(response => {
      const feeAmount = (UNSPENTS_TOTAL - _.sumBy(response.data.transaction.Vout, function (vout) { return vout.Value })).toFixed(8)
      const sendAmount = (UNSPENTS_TOTAL - parseFloat(feeAmount)).toFixed(8)
      const receiveAddress = response.data.transaction.Vout[0].ScriptPubKey.Addresses[0]
      return { feeAmount, sendAmount, receiveAddress }
    })
}
