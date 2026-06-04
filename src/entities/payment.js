/*
  Payment Entity
*/

const PAYMENT_METHODS = ['Blockchain', 'Stripe']

class Payment {
  validate ({ userId, type, paymentMethod = 'Blockchain' } = {}) {
    // Input Validation
    if (!userId || typeof userId !== 'string') {
      throw new Error("Property 'userId' must be a string!")
    }

    if (!type || typeof type !== 'number') {
      throw new Error("Property 'type' must be a number!")
    }

    if (paymentMethod && typeof paymentMethod !== 'string') {
      throw new Error("Property 'paymentMethod' must be a string!")
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error("Property 'paymentMethod' must be 'Blockchain' or 'Stripe'")
    }

    return { userId, type, paymentMethod }
  }
}

export default Payment
