const test = require('node:test');
const assert = require('node:assert/strict');
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

test('writes are visible to a fresh sqlite connection', () => {
  upsertProducts([{ name: 'Persisted Product', price: 19, quantity: 4, desc: 'A persisted test item', image: null, emoji: '🧪', color: '#000' }]);

  const freshConnection = new DatabaseSync(dbPath);
  const persisted = freshConnection.prepare("SELECT name FROM products WHERE name = 'Persisted Product'").all();
  freshConnection.close();

  assert.equal(persisted.length, 1);
});
