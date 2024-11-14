// Global npm libraries
import mongoose from 'mongoose'

const Payment = new mongoose.Schema({
  createdAt: { type: Number, required: true }, // Timestamp of payment creation
  userId: { type: String, required: true }, // pearson-api user id
  priceSats: { type: Number, required: true }, // Payment price in sats
  priceUSD: { type: Number, required: true }, // Payment price in USD
  status: { type: String, required: true }, // Payment status
  creditsQuantity: { type: Number, required: true }, // Quantity of credits to send to the user
  completedAt: { type: Number }, // Timestamp of payment completion
  type: { type: Number }, // Payment bracket
  txs: { type: Array, default: [] } // Transactions list.
})

export default mongoose.model('payment', Payment)
