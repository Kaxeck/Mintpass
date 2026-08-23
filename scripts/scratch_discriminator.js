const crypto = require('crypto');

function getDiscriminator(name) {
  const hash = crypto.createHash('sha256').update(`account:${name}`).digest();
  return Array.from(hash.slice(0, 8));
}

console.log('TicketReceipt:', getDiscriminator('TicketReceipt'));
console.log('EventRecord:', getDiscriminator('EventRecord'));
