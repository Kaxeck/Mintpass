const { Connection } = require("@solana/web3.js");
async function run() {
  const connection = new Connection("https://api.devnet.solana.com");
  const tx = await connection.getTransaction("5XW712M91iYBg9yqJLsWzSTY8VJRk6e7qxtL5Q4SXADkDz6AgY8MACRJSHhWdDe5HoGhJpGSnQ5FhpYPmA7n3y5a", { maxSupportedTransactionVersion: 0 });
  console.log(JSON.stringify(tx.meta.logMessages, null, 2));
}
run();
