const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.sqlite');
console.log('dbPath=' + dbPath);
console.log('exists=' + fs.existsSync(dbPath));
const db = new DatabaseSync(dbPath);
console.log('tables=' + JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()));
console.log('products=' + JSON.stringify(db.prepare('SELECT * FROM products').all()));
console.log('orders=' + JSON.stringify(db.prepare('SELECT * FROM orders').all()));
db.close();
