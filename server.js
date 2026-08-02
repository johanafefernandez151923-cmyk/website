const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getProducts, upsertProducts, getOrders, addOrder, resetOrders } = require('./db');
const { sendSmsNotification } = require('./sms');

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
    image: null,
    quantity: 10,
  },
  {
    name: 'Harbor Bottle',
    price: 59,
    desc: 'A durable bottle with a sleek silhouette for daily rituals.',
    image: null,
    quantity: 12,
  },
  {
    name: 'Summit Backpack',
    price: 229,
    desc: 'Weather-ready carryall built for commuting and weekend adventures.',
    image: null,
    quantity: 8,
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
  const products = getProducts();
  const productById = Object.fromEntries(products.map((product) => [product.id, product]));
  const orders = rows.map((row) => {
    const product = productById[row.product_id];
    const addressParts = [row.address].filter(Boolean);
    const customerAddress = addressParts.join(', ');

    return {
      id: row.id,
      createdAt: row.order_date || new Date().toISOString(),
      customer: {
        name: row.customer_name || 'Customer',
        email: '',
        address: customerAddress,
        city: '',
        zip: '',
        phone: row.phone_number || '',
      },
      payment: 'Cash',
      notes: '—',
      items: [
        {
          name: product?.name || `Product ${row.product_id}`,
          price: Number(product?.price ?? 0),
          quantity: Number(row.quantity ?? 1),
        },
      ],
      totals: {
        total: Number(row.total_price ?? 0),
      },
    };
  });

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
    createdAt: order.createdAt || order.order_date || new Date().toISOString(),
    customer: {
      name: order?.customer?.name || order?.customer_name || order?.name || 'Customer',
      email: order?.customer?.email || '',
      address: order?.customer?.address || order?.address || '',
      city: order?.customer?.city || '',
      zip: order?.customer?.zip || '',
      phone: order?.customer?.phone || order?.phone_number || order?.phone || '',
    },
    payment: order?.payment || 'Cash',
    notes: order?.notes || '—',
    items: Array.isArray(order?.items) ? order.items : [],
    totals: order?.totals || { total: order?.total_price ?? order?.totalPrice ?? 0 },
    product_id: order.product_id ?? order.productId,
    quantity: order.quantity,
    total_price: order.total_price ?? order.totalPrice,
  })));
});

app.post('/api/order', async (req, res) => {
  const order = req.body;
  if (!order) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  addOrder(order);

  try {
    const smsResult = await sendSmsNotification(order);
    return res.json({ success: true, order, sms: smsResult });
  } catch (error) {
    return res.status(500).json({ success: true, order, sms: { ok: false, error: error.message } });
  }
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
