TokenTiger Payment Specs
================================

Sync Users Workflow
------------------

* Already registered users
Already registered users will be added to the payment-api database using a script.

* Future users
Users who register after the update will automatically also be registered in the payment-api.

Following the 2 steps above will ensure that each user is registered in the payment-api.

### The users model in payment-api contains the following properties:

* `_id`
* `email` (unique)
* `username`
* `password`
* `pearsonId` (user id in pearson-api - unique) (this value will be useful later to interact with certain pearson-api endpoints)
* `walletIndex` (index of the path derived from the main wallet - unique)
* `walletaddress` (bch address of the path derived from the main wallet - unique)

* All unique properties prevent the creation of double users with the same data.
* The `walletIndex` value starts from 0 for the first user and is increased by 1 for subsequent users.
* The derived path used is `m/44'/245'/0'/0/${walletIndex}`


Payment Detection Workflow
------------------

### User model
The properties related to the payment are the following:
* `walletAddress` (user address to review)
* `lastPaymentTime` (timestamp of the last detected transaction)
* `lastReviewTime` (timestamp of last reviewed payment)
	
### Workflow
Using the ZMQ library, we can detect the flow of transactions on the network in real time.

When the output of a transaction matches an address assigned to a payment-api user, a timestamp is set in the `lastPaymentTime` property.

When a payment is processed a timestamp is added to the `lastReviewTime` property
	   
Using these properties we can detect when a payment has not been processed (if `lastPaymentTime` is greater than `lastReviewTime`).

This functionality is executed in a timer controller, therefore, in each time interval these payment reviews will be made.

### User Address
Each user also has a property called `pearsonId`, which refers to the `pearson-api` user id.

Users will be able to access their assigned address using the endpoint `GET /users/address/:pearsonId`

Currently this endpoint does not have permissions to access it.