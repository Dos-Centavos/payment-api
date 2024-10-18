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

    this.wallet = new MinimalBCHWallet()

    // Bind 'this' object to subfunctions
    this.connect = this.connect.bind(this)
    this.disconnect = this.disconnect.bind(this)
    this.decodeMsg = this.decodeMsg.bind(this)
    this.getTx = this.getTx.bind(this)
    this.getBlock = this.getBlock.bind(this)
    this.getOutputAddresses = this.getOutputAddresses.bind(this)
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
        this.getOutputAddresses(txd)
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

  // Get the next TX in the queue
  getTx () {
    // console.log(`this.txQueue.length: ${this.txQueue.length}`)
    let nextTx = this.txQueue.shift()
    // console.log(`nextTx: ${JSON.stringify(nextTx, null, 2)}`)

    if (nextTx === undefined) nextTx = false

    return nextTx
  }

  // Get the next block in the queue
  getBlock () {
    // console.log(`this.blockQueue.length: ${this.blockQueue.length}`)
    let nextBlock = this.blockQueue.shift()

    if (nextBlock === undefined) nextBlock = false

    return nextBlock
  }

  // Checks if the addresses of the output of a transaction match
  // with an address registered in the database.
  // If a registered address is detected, a timestamp is saved
  async getOutputAddresses (tx) {
    const out = tx.outputs
    for (let i = 0; i < out.length; i++) {
      const outp = out[i]
      // console.log(outp.scriptPubKey.addresses)
      const addresses = outp.scriptPubKey.addresses
      for (let j = 0; j < addresses.length; j++) {
        const legacy = addresses[j]
        if (!legacy) continue
        const cashAddr = this.wallet.bchjs.Address.toCashAddress(legacy)
        await this.reviewAddress(cashAddr)
      }
    }
  }

  // Checks if the address provided belongs to a registered user
  // If this is the case, then saves a timestamp to the user model.
  async reviewAddress (addr) {
    try {
      const user = await this.localdb.Users.findOne({ walletAddress: addr })
      if (!user) {
        return
      }

      user.lastPaymentTime = new Date().getTime()

      await user.save()

      console.log(`user payment receive ${user.email}`)
    } catch (err) {
      console.error('Error in reviewAddress: ', err)
    }
  }
}

// module.exports = ZMQ
export default ZMQ
