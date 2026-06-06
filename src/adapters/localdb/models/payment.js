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
  txs: { type: Array, default: [] }, // Transactions list.
  paymentMethod: { type: String, required: true, default: 'Blockchain' }, // Payment method Blockchain or Stripe
  stripeSessionId: { type: String }, // Stripe Checkout Session ID
  stripePaymentIntentId: { type: String } // Stripe PaymentIntent ID (embedded card)
})

export default mongoose.model('payment', Payment)
