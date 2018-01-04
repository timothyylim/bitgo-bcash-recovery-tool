const axios = require('axios')
const index = require('./index')
const generateAddress = require('./generateAddress')

module.exports = (hdNodes) => {
  const network = index.NETWORK
  let collectedUnspentAddresses = {}
  let collectedUnspents = []

  // Handle unspents from user generated addresses
  const p1 = getUnspentAddresses(hdNodes, 0, network)
    .then(unspentAddresses => {
      if (Object.keys(unspentAddresses).length) {
        collectedUnspentAddresses = {...collectedUnspentAddresses, ...unspentAddresses}
        return getUnspentTransactions(Object.keys(unspentAddresses))
      } else {
        return []
      }
    })

  //  Handle unspents from change addresses
  const p2 = getUnspentAddresses(hdNodes, 1, network)
    .then(unspentAddresses => {
      if (Object.keys(unspentAddresses).length) {
        collectedUnspentAddresses = {...collectedUnspentAddresses, ...unspentAddresses}
        return getUnspentTransactions(Object.keys(unspentAddresses))
      } else {
        return []
      }
    })

  // Resolve promises sequentially and print results to the message console
  return p1.then(unspents => {
    index.updateConsole('Found ' + unspents.length + ' user generated addresses with unpsent transactions \n')
    if (unspents.length) {
      collectedUnspents = [...collectedUnspents, ...unspents]
      unspents.forEach(unspent => {
        index.updateConsole(unspent.address + ': ' + unspent.amount + ' BCH')
      })
      index.updateConsole('\n')
    }
    return p2
  })
  .then(unspents => {
    index.updateConsole('Found ' + unspents.length + ' change addresses with unpsent transactions \n')
    if (unspents.length) {
      collectedUnspents = [...collectedUnspents, ...unspents]
      unspents.forEach(unspent => {
        index.updateConsole(unspent.address + ': ' + unspent.amount + ' BCH')
      })
      index.updateConsole('\n')
    }

    if (collectedUnspents.length === 0) {
      throw new Error('No BCH to recover')
    }

    // Add address details to unspents
    collectedUnspents.forEach(unspent => {
      unspent.addressDetails = collectedUnspentAddresses[unspent.address]
    })

    return collectedUnspents
  })
}

const getUnspentAddresses = function (hdNodes, path, network) {
  let unspentAddresses = {}
  let numSequentialAddressesWithoutTxs = 0
  let MAX_SEQUENTIAL_ADDRESSES_WITHOUT_TXS = 20 // used to prevent endless child-key derivations and handle skipped (unused) addresses

  return new Promise(function (resolve, reject) {
    function recursiveLookup (addrIndex, done) {
      var generatedAddress = generateAddress({
        hdNodes: hdNodes,
        path: '/' + path + '/' + addrIndex,
        network
      })

      axios.get('https://blockdozer.com/insight-api/addr/' + generatedAddress.address)
        .then(response => {
          const address = response.data
          const transactionCount = address.transactions.length
          if (transactionCount === 0) {
            numSequentialAddressesWithoutTxs++
          } else {
            numSequentialAddressesWithoutTxs = 0
          }
          if (address.balance > 0) {
            // Collect address details
            generatedAddress.chainPath = '/' + path + '/' + addrIndex
            unspentAddresses[generatedAddress.address] = generatedAddress
          }

          if (numSequentialAddressesWithoutTxs >= MAX_SEQUENTIAL_ADDRESSES_WITHOUT_TXS) {
            done()
          } else {
            recursiveLookup(addrIndex + 1, done)
          }
        })
        .catch(error => {
          console.log(error)
        })
    }

    recursiveLookup(0, () => {
      resolve(unspentAddresses)
    })
  })
}

const getUnspentTransactions = function (addressList) {
  return axios.get('https://blockdozer.com/insight-api/addrs/' + addressList.join() + '/utxo')
    .then(response => {
      return response.data
    })
    .catch(error => {
      console.log(error)
      return []
    })
}
