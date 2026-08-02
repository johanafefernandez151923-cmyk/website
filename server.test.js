const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { getProducts, upsertProducts, getOrders, addOrder, resetOrders, dbPath } = require('./db');

test('products can be stored and retrieved', () => {
  upsertProducts([{ name: 'Test Product', price: 10, quantity: 3, desc: 'A test', image: null, emoji: '🧪', color: '#000' }]);
  const products = getProducts();
  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Test Product');
});

test('orders can be added and cleared', () => {
  resetOrders();
  addOrder({ product_id: 1, quantity: 2, total_price: 20 });
  const orders = getOrders();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].product_id, 1);
  assert.equal(orders[0].quantity, 2);
  assert.equal(orders[0].total_price, 20);
  resetOrders();
});

test('checkout-style orders are converted into stored rows', () => {
  resetOrders();
  addOrder({
    id: 42,
    items: [
      { productId: 7, quantity: 3, price: 25 },
      { productId: 9, quantity: 1, price: 40 },
    ],
  });

  const orders = getOrders();
  assert.equal(orders.length, 2);
  assert.deepEqual(
    orders.map((row) => ({ product_id: row.product_id, quantity: row.quantity, total_price: row.total_price })),
    [
      { product_id: 9, quantity: 1, total_price: 40 },
      { product_id: 7, quantity: 3, total_price: 75 },
    ]
  );
  resetOrders();
});

test('products table does not expose legacy emoji or color columns', () => {
  const connection = new DatabaseSync(dbPath);
  const columns = connection.prepare('PRAGMA table_info(products)').all().map((column) => column.name);
  connection.close();

  assert.ok(!columns.includes('emoji'));
  assert.ok(!columns.includes('color'));
});

test('order writes preserve customer metadata', () => {
  resetOrders();
  addOrder({
    id: 99,
    createdAt: '2026-08-02T00:00:00.000Z',
    customer: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      address: '123 Main St',
      phone: '555-1234',
    },
    items: [{ id: 1, quantity: 2, price: 10 }],
    totals: { total: 20 },
  });

  const storedOrders = getOrders();
  assert.equal(storedOrders.length, 1);
  assert.equal(storedOrders[0].customer_name, 'Jane Doe');
  assert.equal(storedOrders[0].address, '123 Main St');
  assert.equal(storedOrders[0].phone_number, '555-1234');
  assert.equal(storedOrders[0].order_date, '2026-08-02T00:00:00.000Z');
  resetOrders();
});

test('writes are visible to a fresh sqlite connection', () => {
  upsertProducts([{ name: 'Persisted Product', price: 19, quantity: 4, desc: 'A persisted test item', image: null, emoji: '🧪', color: '#000' }]);

  const freshConnection = new DatabaseSync(dbPath);
  const persisted = freshConnection.prepare("SELECT name FROM products WHERE name = 'Persisted Product'").all();
  freshConnection.close();

  assert.equal(persisted.length, 1);
});

test('legacy order tables gain customer metadata columns during schema migration', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'northstar-db-'));
  const tempDbPath = path.join(tempDir, 'data.sqlite');
  process.env.DB_PATH = tempDbPath;
  delete require.cache[require.resolve('./db')];

  const connection = new DatabaseSync(tempDbPath);
  connection.exec(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT
    );
    INSERT INTO orders (payload) VALUES ('{"product_id": 3, "quantity": 2, "total_price": 18}')
  `);
  connection.close();

  const dbModule = require('./db');
  const migratedConnection = new DatabaseSync(tempDbPath);
  const columns = migratedConnection.prepare('PRAGMA table_info(orders)').all().map((column) => column.name);
  migratedConnection.close();

  assert.ok(columns.includes('customer_name'));
  assert.ok(columns.includes('address'));
  assert.ok(columns.includes('phone_number'));
  assert.ok(columns.includes('order_date'));

  delete require.cache[require.resolve('./db')];
  delete process.env.DB_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});
