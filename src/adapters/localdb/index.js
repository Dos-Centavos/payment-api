/*
  This library encapsulates code concerned with MongoDB and Mongoose models.
*/

// Load Mongoose models.
import Users from './models/users.js'
import Payments from './models/payment.js'
class LocalDB {
  constructor () {
    // Encapsulate dependencies
    this.Users = Users
    this.Payments = Payments
  }
}

export default LocalDB
