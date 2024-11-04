## Payment Database Model

A new database model called `Payment` is proposed, this is in order to keep track of all payments (BCH amount per credit, user payment history, payment time window, etc.). The Payment model will have the following properties:

### Payment Model

- `createdAt`: Timestamp
- `userId`: String
- `priceUSD`: Number
- `priceBCH`: Number
- `status`: String ('in process, 'cancelled', 'completed')
- `creditsQuantity`: Number
- `completedAt`: Timestamp

### Characteristics

- When a user selects a payment bracket to buy, an instance of this model will be created.
- A user can only have one active payment model at a time, so the payment will have to be completed before creating a new one.
- The user can always cancel the payment before it is completed, giving him the possibility of creating a new Payment transaction for another payment bracket.
- Each user will have a record of all the payments they have made.
- This gives users the possibility of paying the bracket with different transactions.

### Validation

- When a transaction is made to an address designated to the user, the `payment-api` detects the payment and marks the address to be processed.
- Every time interval these marked addresses are processed.
- Once the payment begins to be processed, the last Payment Model with status `in process` must be searched to verify the estimated balance.
- Once verified, the designated amount of credits are recharged to the user.

**NOTE:** The balance must be transferred to an address designated to store all the BCH of each payment. (This is in order to leave the user's address with 0 balance for future validations)
