# How to build and interact with an Oracle - Chainlink
This repo will show how to build and interact with the simplest possible oracle that allows only one user, its owner, to fetch data from Binance's public API.

## Prepare the folder & files
Initialize your new project by running the ``` npm init -y ``` command.
Next, let's install the following dependencies: truffle, openzeppelin-solidity, loom-js, loom-truffle-provider, bn.js, and axios.
``` npm i truffle openzeppelin-solidity loom-js loom-truffle-provider bn.js axios ```

You'll be using Truffle to compile and deploy your smart contracts to Loom Testnet so we've gone ahead and created two bare-bones Truffle projects:

The oracle will live in the oracle directory:
``` mkdir oracle && cd oracle && npx truffle init && cd .. ```

The caller contract will live in the caller directory:
``` mkdir caller && cd caller && npx truffle init && cd .. ```

Introduce your Smart Contracts in the folder 'contracts' and generate the private keys with the script (please be in the correct folder)
  - For the oracle

  ```node scripts/gen-key.js oracle oracle_private_key```
  - For the caller

  ```node scripts/gen-key.js caller/caller_private_key```

Now yo can deploy the Smart Contracts (you must configure first de truffle-config.js, see below)
  - For the oracle

  ```npx truffle deploy --network extdev```
  - For the caller

  ```npx truffle deploy --network extdev```

To see how it works, run the Oracle and then in a new terminal windows the Client
``` node EthPriceOracle.js ```
``` node Client.js ```

### Chapter 9

This lesson picks up where we left off last time, and we're going to look at how to:

- Implement the JavaScript component of the oracle.
- Write a simple Node.js client that interacts with the oracle. To keep things simple, you won't be building a fully-fledged web interface, but the code you'll write in this lesson will help you understand all the key aspects.
- o glue everything together, we'll teach you how to deploy the smart contracts and run the oracle.

------------

We've imported the build artifacts, and stored them in a const called OracleJSON. If you don't recall from the previous lessons what the build artifacts are, here's a quick refresher. The build artifacts are comprised of the bytecode versions of the smart contracts, ABIs, and some internal data Truffle is using to correctly deploy the code.

## Instantiate the Oracle Contract

The build artifacts live inside of a JSON file, and we've imported them using the following line of code:
```js
const OracleJSON = require('./oracle/build/contracts/EthPriceOracle.json')
```
As an example, based on the information stored in this file, your application knows that the setLatestEthPrice function takes three uint256s as arguments (_ethPrice, _callerAddress, and _id), and it can create a transaction that calls this function.

But before that, interacting with a deployed contract from JavaScript requires you to instantiate it using the web3.eth.Contract. Let's look at an example to make the concept clear:
```js
const myContract = new web3js.eth.Contract(myContractJSON.abi, myContractJSON.networks[networkId].address)
```
Note that the above example uses a variable called networkId that identifies the network on which your contract has been deployed. The networkId for Extdev is 9545242630824, so you could declare the networkId variable as follows:
```js
const networkId = 9545242630824
```
Easy peasy! But no matter how simple the above line of code looks, it's not such a good idea to hardcode the identifier of the network like this. Why not? Well, because doing so would require you to update networkId every time your contract gets deployed to a different network.

A better solution is to resolve networkId by calling the 
web3js.eth.net.getId() function:
```js
const networkId = await web3js.eth.net.getId()
```

## Listening for events

The oracle will just fire an event that'll trigger an action. So, before writing the code that calls the oracle contract, your app should first "watch" for events.

Now, every time the oracle fires GetLatestEthPriceEvent, your app should pick up that event and push it to the pendingRequests array.

As an example, here's how you can listen for an event:
```js
myContract.events.EventName(async (err, event) => {
  if (err) {
    console.error('Error on event', err)
    return
  }
  // Do something
})
```
The above snippet just listens for an event called EventName. For more complex use cases, you could also specify a filter like so:
```js
myContract.events.EventName({ filter: { myParam: 1 }}, async (err, event) => {
  if (err) {
    console.error('Error on event', err)
    return
  }
  // Do something
})
```
The above triggers only when an event where myParam is equal to 1 gets fired.

## Adding a Request to the Processing Queue

Note that you can access an event's return values through the returnValues object. Say your event is defined like this:
```js
event TransferTokens(address from, address to, uint256 amount)
```
Then, your JavaScript code that retrieves from, to, and amount should be similar to the following:
```js
async function parseEvent (event) {
  const from = event.returnValues.from
  const to = event.returnValues.to
  const amount = event.returnValues.amount
}
```

The function should pack the callerAddress and id into an object and then push that object to the pendingRequests array. Yeah, this sounds like a complicated thing to do. But the good news is that it's not even nearly as complicated as it sounds. Let's look at an example that pushes an object to an array:
```js
let numbers = [ { 1: 'one' }, { 2: 'two' } ]
numbers.push({ 3: 'three' })
console.log(numbers)
```
If you run the above snippet, it'll print:
```js
[ { '1': 'one' }, { '2': 'two' }, { '3': 'three' } ]
```

## Looping Trough the Processing Queue

Having coded the function that adds a new request whenever the oracle contract fires GetLatestEthPriceEvent, the next thing on your list should be to process these requests.

Imagine there are a bunch of caller contracts sending requests to your oracle. Processing the pendingRequests array in Node.js could be problematic for a very simple reason: JavaScript is single-threaded. This means that all other operations would be blocked until the processing is finished.

A technique to solve this problem is to break the array into smaller chunks (up to MAX_CHUNK_SIZE), and process these chunks individually. To simplify things, after each chunk, the application will sleep for SLEEP_INTERVAL milliseconds.

You'll implement this with a while loop.

A while loop is comprised of a condition that's evaluated at every pass and the code that gets executed. The condition is enclosed in parentheses and the code is enclosed in curly brackets:
```js
let counter = 0
while ( counter <= 10 ) {
  console.log(counter)
  counter++
}
```
But what if two conditions must be met for the code in the curly brackets to be executed? If so, you can test for two conditions (or more than two if you want), by chaining them using the logical AND operator (&&):

```js
let counter = 0
while ( counter <= 10 && isNotMonday) {
  console.log(counter)
  counter++
}
```

### Processing the Queue

The first thing your function should do is to retrieve the first element from the pendingRequest array. Of course, once retrieved, the element should also be removed from the array. In JavaScript, you can do this by calling the shift method which returns the first element of the array, removes the element from the array, and changes the length of the array. Continuing our example from the second chapter, here's how shift works:

### The Retry Loop

Now, retrieving the ETH price from the Binance public API comes with the following aspects which are worth paying attention to.

On one hand, suppose that you make a request but there's a network glitch. If so, the request will fail. If you just let that happen, the caller contract will have to reinitiate the whole process from the beginning, even if in a matter of seconds the network connectivity is restored. Yeah, this is not robust enough. Are we thinking of the same solution? Let's see. The way I'd go about this is to implement a retry mechanism.

So, on error, the application will start retrying. But, on the other hand, if there's a larger issue (like the address of the API has been changed), your app could get stuck in an infinite loop.

Thus, you'll need a condition that breaks the retry loop, if need be.

Similar to how you did in Chapter 4, you'll simply write a while block. But this time, you'll increment a variable on each pass and the loop will check whether that variable is < MAX_RETRIES.

### Try and Catch
Great, you've finished coding the try block💪🏻! Now, let's move to the catch block. Remember, these lines of code are executed if an exception is thrown in the try block.

The logic looks something like this:

First, you'd want to determine if the maximum number of retries has been reached. To do so, you'll use an if statement similar to the one below:
```js
if (condition) {
  doSomething()
}
```
If condition evaluates to true, meaning that the maximum number of retries has been reached, then you'd want to notify the contract that something happened, and the oracle can't return a valid response. The simplest way to do this is to call the setLatestEthPrice and pass it 0 as the ETH price.

If condition evaluates to false, meaning that the maximum number of requests has not been reached, you'd just have to increment the number of retries.

### Working with numbers in Ethereum and JS

Remember we've mentioned that data needs a bit of massaging before it's sent to the oracle contract. Let's look into why.

The Ethereum Virtual Machine doesn't support floating-point numbers, meaning that divisions truncate the decimals. The workaround is to simply multiply the numbers in your front-end by 10**n. The Binance API returns eight decimals numbers and we'll also multiply this by 10**10. Why did we choose 10**10? There's a reason: one ether is 10**18 wei. This way, we'll be sure that no money will be lost.

But there's more to it. The Number type in JavaScript is "double-precision 64-bit binary format IEEE 754 value" which supports only 16 decimals...

Luckily, there's a small library called BN.js that'll help you overcome these issues.

☞ For the above reasons, it's recommended that you always use BN.js when dealing with numbers.

Now, the Binance API returns something like 169.87000000.

Let's see how you can convert this to BN.

First, you'll have to get rid of the decimal separator (the dot). Since JavaScript is a dynamically typed language (that's a fancy way of saying that the interpreter analyzes the values of the variables at runtime and, based on the values, it assigns them a type), the easiest way to do this is...
```js
aNumber = aNumber.replace('.', '')
```
Continuing with this example, converting aNumber to BN would look something like this:
```js
const aNumber = new BN(aNumber, 10)
```
Note: The second argument represents the base. Make sure it's always specified.

We've gone ahead and filled in almost all the code that goes to the setLatestEthPrice function. Here's what's left for you to do.

### Returning multiples variables in JS
The logic for the retrieveLatestEthPrice is trivial to implement and we won't be spending time explaining it. We've just placed the code below the getOracleContract function. Be sure to give it a read so you understand how it works.

Now, the good news is that you're close to wrapping up the oracle. But still, there a few small things left for you to do. For example, let's look into what happens when you start the oracle.

So, every time the oracle starts, it has to:

connect to Extdev TestNet by calling the common.loadAccount function
instantiate the oracle contract
start listening for events
To keep the code clean, you'd want to put all this stuff inside of a function. This function should return a bunch of values needed by other functions:

client (an object the app uses to interact with the Extedev Testnet),
An instance of the oracle contract, and
ownerAddress (used in the setLatestEthPrice to specify the address that sends the transaction).
Now, this is a bit of a challenge because, in JavaScript, functions can't return multiple values. But this doesn't prevent a function from returning... an object or an array, right?

### Wrapping up the oracle

We're closer to being done with the oracle contract. Now it's time to write the code that ties everything together. Remember that, due to JavaScript's single-threaded nature, we're processing the queue in batches and our thread will just sleep for SLEEP_INTERVAL milliseconds between each iteration. For this, we'll use the setInterval function. The following example repeatedly "does something", with a predetermined delay between each iteration:
```js
setInterval(async () => {
 doSomething()
}, SLEEP_INTERVAL)
```
Next, we'd want to provide a way for the user to gracefully shut down the oracle. This can be done by catching the SIGINT handler like this:
```js
process.on( 'SIGINT', () => {
 // Gracefully shut down the oracle
 })
```

### Client

You've just finished implementing the oracle! That's nothing short of amazing🤘🏻

Now it's time to build a bare-bones client that interacts with the oracle.

This chapter is intentionally kept short because you're already familiar with most of the logic, and we don't want to take much of your time doing repetitive stuff.

We've created a new tab for the Client.js file and placed almost everything you need into a file called Client.js. Give it a read-through before moving on.

### Deploy the contracts

In this chapter, we'll briefly walk you through the process of deploying your smart contracts to the Extdev Testnet.

☞ It's outside the scope of this lesson to delve into details about how Truffle works. If you want to get more knowledge about deploying your smart contracts, our Deploying DApps with Truffle lesson is exactly what you need.

Generating the Private Keys
Before you deploy the contracts, you must first create two private keys, one for the caller contract and the other one for the oracle.

To do this, we've come up with a simple script. Just create a directory called scripts and, inside of that directory, make a file named gen-key.js. Then, paste the following content into it:
```js
const { CryptoUtils } = require('loom-js')
const fs = require('fs')

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " <filename>.")
    process.exit(1);
}

const privateKey = CryptoUtils.generatePrivateKey()
const privateKeyString = CryptoUtils.Uint8ArrayToB64(privateKey)

let path = process.argv[2]
fs.writeFileSync(path, privateKeyString)
```
You can now generate the private key for the oracle by entering the ``` node scripts/gen-key.js oracle/oracle_private_key``` command. 

Similarly, to generate the private key for the caller contract, run ``` node scripts/gen-key.js caller/caller_private_key. ```

### Configuring Truffle
Next, you must let Truffle know how to deploy on Extdev Testnet. Because the oracle and the caller contract use different private keys, the easiest way is to create separate configurations.

For the oracle, create a file called oracle/truffle-config.js with the following content:

```js 
const LoomTruffleProvider = require('loom-truffle-provider')

const path = require('path')
const fs = require('fs')

module.exports = {
  networks: {
    extdev: {
      provider: function () {
        const privateKey = fs.readFileSync(path.join(__dirname, 'oracle_private_key'), 'utf-8')
        const chainId = 'extdev-plasma-us1'
        const writeUrl = 'wss://extdev-plasma-us1.dappchains.com/websocket'
        const readUrl = 'wss://extdev-plasma-us1.dappchains.com/queryws'
        return new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKey)
      },
      network_id: '9545242630824'
    }
  },
  compilers: {
    solc: {
      version: '0.8.0'
    }
  }
}
```
### Migration files

To deploy the oracle contract, you must create a file called the ./oracle/migrations/2_eth_price_oracle.js with the following content:
```js
const EthPriceOracle = artifacts.require('EthPriceOracle')

module.exports = function (deployer) {
  deployer.deploy(EthPriceOracle)
}
```
Similarly, to deploy the caller contract, you must create a file called ./caller/migrations/02_caller_contract.js with the following content:
```js
const CallerContract = artifacts.require('CallerContract')

module.exports = function (deployer) {
  deployer.deploy(CallerContract)
}
```

### Updating the package.json file

At this point, you're ready to deploy your contracts. But that'll require you to enter the following commands:
```js
cd oracle && npx truffle deploy --network extdev --reset -all && cd ..
```
followed by:
```js
cd caller && npx truffle deploy --network extdev --reset -all && cd ..
```
Well, I'm not a big fan of typing this every time I want to deploy the contracts. Let's make it easier by modifying the scripts section of the package.json file to this:
```js
"scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "deploy:oracle": "cd oracle && npx truffle deploy --network extdev --reset -all && cd ..",
    "deploy:caller": "cd caller && npx truffle deploy --network extdev --reset -all && cd ..",
    "deploy:all": "npm run deploy:oracle && npm run deploy:caller"
  },
```

Now you can deploy the smart contracts with one command! Type ``` npm run deploy:all ``` in the box to the right, and then press Enter.

We went ahead and started the oracle by running ``` node EthPriceOracle.js. ```

Fire up a terminal window, and start the client by entering the following command: ``` node Client.js. ```

