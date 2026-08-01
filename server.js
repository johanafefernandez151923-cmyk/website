const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getProducts, upsertProducts, getOrders, addOrder, resetOrders } = require('./db');

const app = express();
const port = process.env.PORT || 3100;
const rootDir = __dirname;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const defaultProducts = [
  {
    name: 'Aurora Lamp',
    price: 99,
    desc: 'Soft ambient light for cozy evenings and desk styling.',
    emoji: '💡',
    image: null,
    quantity: 10,
    color: 'linear-gradient(135deg, #ff8a65, #ffb74d)',
  },
  {
    name: 'Harbor Bottle',
    price: 59,
    desc: 'A durable bottle with a sleek silhouette for daily rituals.',
    emoji: '🧴',
    image: null,
    quantity: 12,
    color: 'linear-gradient(135deg, #4db6ac, #26a69a)',
  },
  {
    name: 'Summit Backpack',
    price: 229,
    desc: 'Weather-ready carryall built for commuting and weekend adventures.',
    emoji: '🎒',
    image: null,
    quantity: 8,
    color: 'linear-gradient(135deg, #5c6bc0, #7e57c2)',
  },
];

function seedProductsIfEmpty() {
  const products = getProducts();
  if (products.length === 0) {
    upsertProducts(defaultProducts);
  }
}

seedProductsIfEmpty();

app.get('/api/products', (req, res) => {
  res.json(getProducts());
});

app.post('/api/products', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.products)) {
    return res.status(400).json({ error: 'Invalid products payload' });
  }

  res.json(upsertProducts(payload.products));
});

app.get('/api/orders', (req, res) => {
  const rows = getOrders();
  const orders = rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    quantity: row.quantity,
    total_price: row.total_price,
  }));
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.orders)) {
    return res.status(400).json({ error: 'Invalid orders payload' });
  }

  const orders = payload.orders;
  if (orders.length === 0) {
    resetOrders();
    return res.json([]);
  }

  resetOrders();
  orders.forEach((order) => addOrder(order));
  return res.json(orders.map((order) => ({
    id: order.id,
    product_id: order.product_id ?? order.productId,
    quantity: order.quantity,
    total_price: order.total_price ?? order.totalPrice,
  })));
});

app.post('/api/order', (req, res) => {
  const order = req.body;
  if (!order) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  addOrder(order);
  return res.json({ success: true, order });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const success = username === 'admin' && password === 'admin123';
  return res.status(success ? 200 : 401).json({ success });
});

app.use(express.static(rootDir));

app.get('*', (req, res) => {
  const filePath = path.join(rootDir, req.path === '/' ? 'index.html' : req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  return res.status(404).send('Not found');
});

app.listen(port, () => {
  console.log(`Server listening on http://127.0.0.1:${port}/`);
});
