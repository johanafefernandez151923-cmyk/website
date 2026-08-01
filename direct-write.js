const fs = require('fs');
const path = require('path');
const { upsertProducts, getProducts, dbPath } = require('./db');

upsertProducts([{ name: 'Direct Write Test', price: 12, quantity: 3, desc: 'test', image: null, emoji: '🧪', color: '#000' }]);
const rows = getProducts();
fs.writeFileSync(path.join(__dirname, 'db-check.json'), JSON.stringify({ dbPath, rows }, null, 2));
console.log('wrote', rows.length);
