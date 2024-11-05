/*
  Mocks for the use cases.
*/
/* eslint-disable */

class UserUseCaseMock {
  async createUser(userObj) {
    return {}
  }

  async getAllUsers() {
    return true
  }

  async getUser(params) {
    return true
  }

  async updateUser(existingUser, newData) {
    return true
  }

  async deleteUser(user) {
    return true
  }

  async authUser(login, passwd) {
    return {
      generateToken: () => {}
    }
  }
  async reviewPayments(){
    return true
  }
  async getUserAddressByPearsonId(){
    return true
  }
}

class PaymentUseCaseMock {
  async createPayment(userObj) {
    return {}
  }

  async getAllPayments() {
    return true
  }

  async getPayment(params) {
    return true
  }

  async cancelPayment(existingPayment) {
    return true
  }

  async deletePayment(user) {
    return true
  }
}

class UseCasesMock {
  constuctor(localConfig = {}) {
    // this.user = new UserUseCaseMock(localConfig)
  }

  user = new UserUseCaseMock()
  payment = new PaymentUseCaseMock()
}

export default UseCasesMock;
