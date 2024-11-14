/*
  A library for working with the ZMQ/websocket connection of a full node. This
  is used to get notifications of new mempool transactions and newly mined
  blocks.
*/

// Public npm libraries
import BitcoinCashZmqDecoder from '@psf/bitcoincash-zmq-decoder'
import { socket } from 'zeromq/v5-compat.js'
import MinimalBCHWallet from 'minimal-slp-wallet'

class ZMQ {
  constructor (localConfig = {}) {
    // Encapsulate dependencies
    this.sock = socket('sub')
    this.bchZmqDecoder = new BitcoinCashZmqDecoder('mainnet')
    this.config = localConfig.config
    this.localdb = localConfig.localdb
    // State
    this.txQueue = []
    this.blockQueue = []
    this.detectedTxs = []
    this.wallet = new MinimalBCHWallet()

    // Bind 'this' object to subfunctions
    this.connect = this.connect.bind(this)
    this.disconnect = this.disconnect.bind(this)
    this.decodeMsg = this.decodeMsg.bind(this)
    this.reviewOutputAddresses = this.reviewOutputAddresses.bind(this)
  }

  // Connect to the ZMQ port of the full node.
  async connect () {
    try {
      this.sock.connect(`tcp://${this.config.zmqIp}:${this.config.zmqPort}`)
      this.sock.subscribe('raw')

      // Send incoming messages to the decodeMsg() function.
      this.sock.on('message', this.decodeMsg)

      // Return true to signal that the function has completed successfully.
      return true
    } catch (err) {
      console.error('Error in zmq.js/connect()')
      throw err
    }
  }

  disconnect () {
    // this.sock.disconnect(`tcp://${this.config.rpcIp}:${this.config.zmqPort}`)
    this.sock.close()
    return true
  }

  // Decode message coming through ZMQ connection.
  decodeMsg (topic, message) {
    try {
      const decoded = topic.toString('ascii')
      // console.log('decoded topic: ', decoded)

      if (decoded === 'rawtx') {
        // Process new transactions.

        const txd = this.bchZmqDecoder.decodeTransaction(message)
        // console.log(`txd: ${JSON.stringify(txd, null, 2)}`)
        this.reviewOutputAddresses(txd)
        this.txQueue.push(txd.format.txid)
      } else if (decoded === 'rawblock') {
        // Process new blocks

        const blk = this.bchZmqDecoder.decodeBlock(message)
        console.log(`blk: ${JSON.stringify(blk, null, 2)}`)
        this.blockQueue.push(blk)
      }

      return true
    } catch (err) {
      console.error('Error in decodeMsg: ', err)

      // This is a top-level function. Do not throw an error.
      return false
    }
  }

  // Checks if the addresses of the output of a transaction match
  // with an address registered in the database.
  // If a registered address is detected, a timestamp is saved
  async reviewOutputAddresses (tx) {
    try {
      const out = tx.outputs
      // Map outputs
      for (let i = 0; i < out.length; i++) {
        const outp = out[i]

        // console.log(outp.scriptPubKey.addresses)
        const addresses = outp.scriptPubKey.addresses
        // Map addresses
        for (let j = 0; j < addresses.length; j++) {
          const legacy = addresses[j]
          let cashAddr
          try {
            // Try to turn output address( legacy format ) to cash address.
            cashAddr = this.wallet.bchjs.Address.toCashAddress(legacy)
          } catch (error) {
            continue
          }
          // Review cash address
          await this.reviewAddress(cashAddr, tx)
        }
      }
      return true
    } catch (err) {
      console.error('Error in reviewOutputAddresses: ', err)
      return false
    }
  }

  // Checks if the address provided belongs to a registered user
  // If this is the case, then saves a timestamp to the user model.
  async reviewAddress (addr, tx) {
    try {
      // Looking for in-app address
      const user = await this.localdb.Users.findOne({ walletAddress: addr })
      if (!user) {
        return false
      }
      console.log(`Detected tx in app-wallet ${tx.format.txid}`)

      // Verify if the transaction has been handled
      // NOTE : This condition is here because the payments are detected a couple of times,
      // it was detected before any block confirmation
      // and after a block confirmation.
      const existingTx = await this.localdb.Payments.findOne({ txs: tx.format.txid })

      if (existingTx) {
        console.log(`Tx : ${tx.format.txid} already handled`)
        return false
      }

      // Save unhandled-tx into the current payment model associated to the user
      const currentUserPayment = await this.localdb.Payments.findOne({
        userId: user._id,
        status: 'in-process'
      })

      if (!currentUserPayment) return false

      currentUserPayment.txs.push(tx.format.txid)
      await currentUserPayment.save()

      user.lastPaymentTime = new Date().getTime()
      await user.save()
      console.log(`user payment receive ${user.email}`)

      return user
    } catch (err) {
      console.error('Error in reviewAddress: ', err)
      return false
    }
  }
}

// module.exports = ZMQ
export default ZMQ
