const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new DatabaseSync(dbPath);
const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 10').all();
const customers = db.prepare('SELECT * FROM customers ORDER BY customer_no DESC LIMIT 10').all();
fs.writeFileSync(path.join(__dirname, 'orders-report.json'), JSON.stringify({ orders, customers }, null, 2));
db.close();
