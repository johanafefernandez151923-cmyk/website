const defaultProducts = [
  {
    name: "Aurora Lamp",
    price: 99,
    desc: "Soft ambient light for cozy evenings and desk styling.",
    emoji: "💡",
    image: null,
    color: "linear-gradient(135deg, #ff8a65, #ffb74d)",
  },
  {
    name: "Harbor Bottle",
    price: 59,
    desc: "A durable bottle with a sleek silhouette for daily rituals.",
    emoji: "🧴",
    image: null,
    color: "linear-gradient(135deg, #4db6ac, #26a69a)",
  },
  {
    name: "Summit Backpack",
    price: 229,
    desc: "Weather-ready carryall built for commuting and weekend adventures.",
    emoji: "🎒",
    image: null,
    color: "linear-gradient(135deg, #5c6bc0, #7e57c2)",
  },
];

let products = JSON.parse(localStorage.getItem("northstarProducts") || "null") || defaultProducts;
let orders = JSON.parse(localStorage.getItem("northstarOrders") || "[]");

const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const cartButton = document.getElementById("cartButton");
const cartOverlay = document.getElementById("cartOverlay");
const cartPanel = document.getElementById("cartPanel");
const cartItemsContainer = document.getElementById("cartItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartShipping = document.getElementById("cartShipping");
const cartTotal = document.getElementById("cartTotal");
const closeCartButton = document.getElementById("closeCartButton");
const continueShoppingButton = document.getElementById("continueShoppingButton");
const checkoutLink = document.getElementById("checkoutLink");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");
const checkoutSummary = document.getElementById("checkoutSummary");

async function notifyCustomerAfterOrder(order) {
  try {
    const response = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });

    const payload = await response.json();
    return payload?.sms || { ok: false, error: "No SMS response" };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
const qrBox = document.getElementById("qrBox");
const addProductForm = document.getElementById("addProductForm");
const adminProductList = document.getElementById("adminProductList");
const adminOrdersContainer = document.getElementById("adminOrders");
const productMessage = document.getElementById("productMessage");
const orderCount = document.getElementById("orderCount");
const orderRevenue = document.getElementById("orderRevenue");
const placeOrderButton = document.getElementById("placeOrderButton");
const logoutButton = document.getElementById("logoutButton");
const productSubmitButton = document.getElementById("productSubmitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const resetOrdersButton = document.getElementById("resetOrdersButton");
const adminRequiredElements = document.querySelectorAll("#addProductForm, #adminProductList, #adminOrders, #orderCount, #orderRevenue");
let cart = JSON.parse(localStorage.getItem("northstarCart") || "[]");
let editingProductName = null;

function formatCurrency(value) {
  return `₱${value.toFixed(2)}`;
}

function saveCart() {
  localStorage.setItem("northstarCart", JSON.stringify(cart));
}

function normalizeCartItems(items = cart) {
  return items.map((item) => {
    const matchedProduct = products.find((product) => product.name === item.name);
    return {
      ...item,
      id: item.id ?? item.productId ?? matchedProduct?.id ?? null,
      productId: item.productId ?? item.id ?? matchedProduct?.id ?? null,
    };
  });
}

async function loadStoreData() {
  try {
    const [productsResponse, ordersResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/orders"),
    ]);

    if (productsResponse.ok) {
      const serverProducts = await productsResponse.json();
      if (Array.isArray(serverProducts)) {
        products = serverProducts;
      } else if (serverProducts && Array.isArray(serverProducts.products)) {
        products = serverProducts.products;
      }
      localStorage.setItem("northstarProducts", JSON.stringify(products));
    }

    cart = normalizeCartItems(JSON.parse(localStorage.getItem("northstarCart") || "[]"));
    saveCart();

    if (ordersResponse.ok) {
      const serverOrders = await ordersResponse.json();
      if (Array.isArray(serverOrders)) {
        orders = serverOrders;
      } else if (serverOrders && Array.isArray(serverOrders.orders)) {
        orders = serverOrders.orders;
      }
      localStorage.setItem("northstarOrders", JSON.stringify(orders));
    }
  } catch (error) {
    products = JSON.parse(localStorage.getItem("northstarProducts") || "null") || defaultProducts;
    orders = JSON.parse(localStorage.getItem("northstarOrders") || "[]");
  }
}

async function saveProducts() {
  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    });

    if (!response.ok) {
      throw new Error("Unable to save products");
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      products = payload;
    } else if (payload && Array.isArray(payload.products)) {
      products = payload.products;
    }
    localStorage.setItem("northstarProducts", JSON.stringify(products));
  } catch (error) {
    localStorage.setItem("northstarProducts", JSON.stringify(products));
  }
}

async function saveOrders() {
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });

    if (!response.ok) {
      throw new Error("Unable to save orders");
    }

    const payload = await response.json();
    const payloadOrders = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.orders)
        ? payload.orders
        : null;

    if (Array.isArray(payloadOrders)) {
      const hasCustomerData = payloadOrders.some((order) => order?.customer || order?.customer_name || order?.customerName || order?.address || order?.phone_number || order?.order_date);
      if (hasCustomerData) {
        orders = payloadOrders;
      }
    }
    localStorage.setItem("northstarOrders", JSON.stringify(orders));
  } catch (error) {
    localStorage.setItem("northstarOrders", JSON.stringify(orders));
  }
}

function isAdminAuthenticated() {
  return localStorage.getItem("northstarAdminAuth") === "true";
}

function requireAdmin() {
  if (!isAdminAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function ensureAdminPage() {
  const path = window.location.pathname;
  if (path.endsWith("/admin.html") || path.endsWith("admin.html")) {
    requireAdmin();
  }
}

function logoutAdmin() {
  localStorage.removeItem("northstarAdminAuth");
  window.location.href = "login.html";
}

function resetProductForm() {
  if (addProductForm) {
    addProductForm.reset();
  }
  if (productSubmitButton) {
    productSubmitButton.textContent = "Add product";
  }
  if (cancelEditButton) {
    cancelEditButton.classList.add("hidden");
  }
  editingProductName = null;
  if (productMessage) {
    productMessage.textContent = "";
  }
}

function populateProductForm(product) {
  if (!addProductForm || !product) return;

  const nameInput = addProductForm.querySelector('input[name="name"]');
  const priceInput = addProductForm.querySelector('input[name="price"]');
  const quantityInput = addProductForm.querySelector('input[name="quantity"]');
  const descInput = addProductForm.querySelector('textarea[name="desc"]');

  if (nameInput) nameInput.value = product.name || "";
  if (priceInput) priceInput.value = product.price ?? "";
  if (quantityInput) quantityInput.value = product.quantity ?? 1;
  if (descInput) descInput.value = product.desc || "";

  if (productSubmitButton) {
    productSubmitButton.textContent = "Save changes";
  }
  if (cancelEditButton) {
    cancelEditButton.classList.remove("hidden");
  }
  editingProductName = product.name;

  if (productMessage) {
    productMessage.textContent = "Editing product details.";
  }
}

function renderProducts() {
  if (!productGrid) return;

  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-image" style="background: ${product.color};">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" />` : product.emoji}
          </div>
          <h3>${product.name}</h3>
          <p>${product.desc}</p>
          <div class="product-meta">
            <span class="price">₱${product.price}</span>
            <button class="btn btn-primary" data-product="${product.name}">Add to cart</button>
          </div>
        </article>
      `
    )
    .join("");
}

function updateCartDisplay() {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = itemCount === 0;

  if (cartCount) {
    cartCount.textContent = itemCount;
  }
  if (checkoutLink) {
    checkoutLink.classList.toggle("disabled", isEmpty);
    checkoutLink.setAttribute("aria-disabled", isEmpty ? "true" : "false");
    checkoutLink.disabled = isEmpty;
  }
  if (placeOrderButton) {
    placeOrderButton.classList.toggle("disabled", isEmpty);
    placeOrderButton.disabled = isEmpty;
    placeOrderButton.setAttribute("aria-disabled", isEmpty ? "true" : "false");
  }
  renderCart();
  renderCheckoutSummary();
}

function getOrderTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal < 100 ? 20 : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function renderCart() {
  const { subtotal, shipping, total } = getOrderTotals();
  if (cartSubtotal) {
    cartSubtotal.textContent = formatCurrency(subtotal);
  }
  if (cartShipping) {
    cartShipping.textContent = shipping === 0 ? "Free" : formatCurrency(shipping);
  }
  if (cartTotal) {
    cartTotal.textContent = formatCurrency(total);
  }

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-state">Your cart is still empty. Pick a few favorites to get started.</p>';
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <div class="cart-item-media">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : `<div class="cart-item-emoji">${item.emoji || "✨"}</div>`}
          </div>
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-price">${formatCurrency(item.price)} each</div>
            <div class="cart-qty-controls">
              <button class="qty-btn" type="button" data-action="decrease" data-name="${item.name}">−</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" type="button" data-action="increase" data-name="${item.name}">+</button>
              <button class="text-btn" type="button" data-action="remove" data-name="${item.name}">Remove</button>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderCheckoutSummary() {
  if (!checkoutSummary) return;
  if (cart.length === 0) {
    checkoutSummary.innerHTML = '<p class="empty-state">Your cart is empty. Add something first.</p>';
    return;
  }

  const { subtotal, shipping, total } = getOrderTotals();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  checkoutSummary.innerHTML = `
    <div class="summary-item">
      <span>Items in cart</span>
      <strong>${itemCount}</strong>
    </div>
    ${cart
      .map(
        (item) => `
          <div class="summary-item">
            <span>${item.name} × ${item.quantity}</span>
            <strong>${formatCurrency(item.price * item.quantity)}</strong>
          </div>
        `
      )
      .join("")}
    <div class="summary-item">
      <span>Subtotal</span>
      <strong>${formatCurrency(subtotal)}</strong>
    </div>
    <div class="summary-item">
      <span>Shipping</span>
      <strong>${shipping === 0 ? "Free" : formatCurrency(shipping)}</strong>
    </div>
    <div class="summary-item">
      <span>Total</span>
      <strong>${formatCurrency(total)}</strong>
    </div>
  `;
}

function renderAdminProducts() {
  if (!adminProductList) return;

  if (products.length === 0) {
    adminProductList.innerHTML = '<p class="empty-state">No products available in the catalog.</p>';
    return;
  }

  adminProductList.innerHTML = products
    .map(
      (product) => `
        <div class="admin-product-item">
          <div class="admin-product-meta">
            <div>
              <strong>${product.name}</strong>
              <p>${product.desc}</p>
              <p class="admin-product-quantity">Quantity: ${product.quantity ?? 0}</p>
            </div>
            <span>${formatCurrency(product.price)}</span>
          </div>
          <div class="product-actions">
            <button class="btn btn-secondary" type="button" data-action="edit-product" data-name="${product.name}">Edit</button>
            <button class="btn btn-secondary" type="button" data-action="remove-product" data-name="${product.name}">Remove</button>
          </div>
        </div>
      `
    )
    .join("");
}

function formatStaticDate(value) {
  if (!value) {
    return "Pending";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
}

function normalizeOrderForDisplay(order) {
  const items = Array.isArray(order?.items) && order.items.length > 0
    ? order.items.map((item) => ({
        ...item,
        name: item.name || item.productName || item.title || "Product",
        price: Number(item.price ?? item.unitPrice ?? item.totalPrice ?? item.total_price ?? 0),
        quantity: Number(item.quantity ?? 1),
      }))
    : [];

  if (items.length === 0) {
    const productId = Number(order?.product_id ?? order?.productId ?? order?.id ?? 0);
    const matchedProduct = products.find((product) => product.id === productId || product.name === order?.name);
    const quantity = Number(order?.quantity ?? 1);
    const total = Number(order?.total_price ?? order?.totalPrice ?? order?.totals?.total ?? 0);

    if (matchedProduct || productId) {
      items.push({
        name: matchedProduct?.name || `Product #${productId}`,
        price: Number(matchedProduct?.price ?? total / Math.max(quantity, 1)),
        quantity,
      });
    }
  }

  const total = Number(
    order?.totals?.total ??
      order?.total_price ??
      order?.totalPrice ??
      items.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 1), 0) ??
      0
  );

  return {
    ...order,
    createdAt: order?.createdAt ?? order?.created_at ?? order?.order_date ?? new Date().toISOString(),
    customer: {
      name: order?.customer?.name ?? order?.customer_name ?? order?.name ?? "Customer",
      email: order?.customer?.email ?? "",
      address: order?.customer?.address ?? order?.address ?? "",
      city: order?.customer?.city ?? "",
      zip: order?.customer?.zip ?? "",
      phone: order?.customer?.phone ?? order?.phone_number ?? order?.phone ?? "",
    },
    payment: order?.payment ?? "Cash",
    notes: order?.notes ?? "—",
    items,
    totals: order?.totals ?? { total },
  };
}

function renderAdminOrders() {
  if (!adminOrdersContainer) return;
  const normalizedOrders = orders.map(normalizeOrderForDisplay);

  if (orderCount) {
    orderCount.textContent = normalizedOrders.length;
  }

  const totalRevenue = normalizedOrders.reduce((sum, order) => sum + Number(order.totals?.total ?? 0), 0);
  if (orderRevenue) {
    orderRevenue.textContent = formatCurrency(totalRevenue);
  }

  if (normalizedOrders.length === 0) {
    adminOrdersContainer.innerHTML = '<p class="empty-state">No orders have been placed yet.</p>';
    return;
  }

  adminOrdersContainer.innerHTML = normalizedOrders
    .slice()
    .reverse()
    .map(
      (order) => `
        <div class="order-card">
          <div class="order-meta">
            <div>
              <strong>Order #${order.id}</strong>
              <p class="order-details">${formatStaticDate(order.createdAt)}</p>
            </div>
            <strong>${formatCurrency(Number(order.totals?.total ?? 0))}</strong>
          </div>
          <div class="order-details">
            <span>${order.customer?.name || "Customer"} • ${order.customer?.email || "No email provided"}</span>
            <span>${[order.customer?.address, order.customer?.city, order.customer?.zip].filter(Boolean).join(", ") || "No address provided"}</span>
            <span>Phone: ${order.customer?.phone || "No phone number provided"}</span>
            <span>Order date: ${formatStaticDate(order.createdAt)}</span>
            <span>Payment: ${order.payment || "Cash"}</span>
            <span>Notes: ${order.notes || "—"}</span>
          </div>
          <div class="order-items">
            ${order.items
              .map(
                (item) => `
                  <div class="order-item">
                    <span>${item.name || "Product"} × ${item.quantity}</span>
                    <strong>${formatCurrency(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function renderAllOrdersPage() {
  const container = document.getElementById("allOrders");
  if (!container) return;

  const normalizedOrders = orders.map(normalizeOrderForDisplay);
  if (normalizedOrders.length === 0) {
    container.innerHTML = '<p class="empty-state">No orders have been placed yet.</p>';
    return;
  }

  container.innerHTML = normalizedOrders
    .slice()
    .reverse()
    .map(
      (order) => `
        <div class="order-card">
          <div class="order-meta">
            <div>
              <strong>Order #${order.id}</strong>
              <p class="order-details">${formatStaticDate(order.createdAt)}</p>
            </div>
            <strong>${formatCurrency(Number(order.totals?.total ?? 0))}</strong>
          </div>
          <div class="order-details">
            <span>${order.customer?.name || "Customer"} • ${order.customer?.email || "No email provided"}</span>
            <span>${[order.customer?.address, order.customer?.city, order.customer?.zip].filter(Boolean).join(", ") || "No address provided"}</span>
            <span>Phone: ${order.customer?.phone || "No phone number provided"}</span>
            <span>Order date: ${formatStaticDate(order.createdAt)}</span>
            <span>Payment: ${order.payment || "Cash"}</span>
            <span>Notes: ${order.notes || "—"}</span>
          </div>
          <div class="order-items">
            ${order.items
              .map(
                (item) => `
                  <div class="order-item">
                    <span>${item.name || "Product"} × ${item.quantity}</span>
                    <strong>${formatCurrency(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function togglePaymentUI() {
  if (!qrBox || !checkoutForm) return;
  const selectedPayment = checkoutForm.querySelector('input[name="payment"]:checked')?.value;
  qrBox.classList.toggle("hidden", selectedPayment !== "qr");
}

function openCart() {
  renderCart();
  cartPanel.classList.add("open");
  cartOverlay.hidden = false;
  cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  cartPanel.classList.remove("open");
  cartOverlay.hidden = true;
  cartPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

if (productGrid) {
  productGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const productName = button.dataset.product;
    const product = products.find((item) => item.name === productName);
    if (!product) return;

    const existingItem = cart.find((item) => item.name === productName);
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.productId = existingItem.productId ?? product.id;
      existingItem.id = existingItem.id ?? product.id;
    } else {
      cart.push({ name: product.name, price: product.price, quantity: 1, emoji: product.emoji, image: product.image, productId: product.id, id: product.id });
    }

    saveCart();
    updateCartDisplay();

    button.textContent = "Added";
    button.disabled = true;
    setTimeout(() => {
      button.textContent = "Add to cart";
      button.disabled = false;
    }, 800);

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = `${productName} added to cart`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1200);
  });
}

if (cartButton) {
  cartButton.addEventListener("click", openCart);
}
if (closeCartButton) {
  closeCartButton.addEventListener("click", closeCart);
}
if (continueShoppingButton) {
  continueShoppingButton.addEventListener("click", closeCart);
}
if (cartOverlay) {
  cartOverlay.addEventListener("click", closeCart);
}
if (checkoutLink) {
  checkoutLink.addEventListener("click", (event) => {
    if (checkoutLink.disabled) {
      event.preventDefault();
      return;
    }
    closeCart();
    window.location.href = "checkout.html";
  });
}

if (cartItemsContainer) {
  cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const name = button.dataset.name;
  const item = cart.find((entry) => entry.name === name);

  if (!item) return;

  if (action === "increase") {
    item.quantity += 1;
  } else if (action === "decrease") {
    item.quantity -= 1;
    if (item.quantity <= 0) {
      cart = cart.filter((entry) => entry.name !== name);
    }
  } else if (action === "remove") {
    cart = cart.filter((entry) => entry.name !== name);
  }

  saveCart();
  updateCartDisplay();
});
}

if (checkoutForm) {
  checkoutForm.addEventListener("change", (event) => {
    if (event.target.name === "payment") {
      togglePaymentUI();
    }
  });

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(checkoutForm);
    const order = {
      id: Date.now(),
      createdAt: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      }),
      customer: {
        name: formData.get("name")?.toString().trim(),
        email: formData.get("email")?.toString().trim(),
        address: [formData.get("address")?.toString().trim(), formData.get("city")?.toString().trim(), formData.get("zip")?.toString().trim()].filter(Boolean).join(", "),
        city: formData.get("city")?.toString().trim(),
        zip: formData.get("zip")?.toString().trim(),
        phone: formData.get("phone")?.toString().trim(),
      },
      payment: formData.get("payment")?.toString().trim(),
      notes: formData.get("notes")?.toString().trim(),
      items: normalizeCartItems(cart).map((item) => ({ ...item })),
      totals: getOrderTotals(),
    };

    orders.push(order);
    cart = [];
    saveCart();
    updateCartDisplay();

    const smsResult = await notifyCustomerAfterOrder(order);
    if (checkoutMessage) {
      checkoutMessage.textContent = smsResult?.ok
        ? `Order placed successfully! A confirmation SMS has been sent to ${order.customer.phone || "the provided phone number"}.`
        : "Order placed successfully! We couldn't send the SMS confirmation right now.";
    }

    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const serverOrders = await response.json();
        if (Array.isArray(serverOrders)) {
          orders = serverOrders;
          localStorage.setItem("northstarOrders", JSON.stringify(orders));
        }
      }
    } catch (error) {
      // keep using the locally queued order data if the refresh fails
    }

    checkoutForm.reset();
    const qrRadio = checkoutForm.querySelector('input[name="payment"][value="qr"]');
    if (qrRadio) {
      qrRadio.checked = true;
    }
    renderAdminOrders();
  });
}

if (addProductForm) {
  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(addProductForm);
    const name = formData.get("name")?.toString().trim();
    const price = Number(formData.get("price"));
    const quantity = Number(formData.get("quantity"));
    const desc = formData.get("desc")?.toString().trim();
    const color = formData.get("color")?.toString().trim() || "linear-gradient(135deg, #8ecae6, #219ebc)";
    const photoFile = formData.get("photo");

    if (!name || !desc || !price || Number.isNaN(price) || !Number.isInteger(price) || price <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      if (productMessage) {
        productMessage.textContent = "Please provide a valid name, description, price, and quantity.";
      }
      return;
    }

    const finishProductSave = async (image) => {
      if (editingProductName) {
        const productIndex = products.findIndex((item) => item.name === editingProductName);
        if (productIndex >= 0) {
          const existingProduct = products[productIndex];
          const updatedProduct = {
            ...existingProduct,
            name,
            price,
            quantity,
            desc,
            image: image ?? existingProduct.image ?? null,
            color,
            emoji: image ? "📦" : existingProduct.emoji || "✨",
          };
          products[productIndex] = updatedProduct;

          if (existingProduct.name !== name) {
            cart = cart.map((item) => (item.name === existingProduct.name ? { ...item, name } : item));
            saveCart();
          }

          await saveProducts();
          renderProducts();
          renderAdminProducts();
          resetProductForm();
          if (productMessage) {
            productMessage.textContent = "Product updated successfully.";
          }
          return;
        }
      }

      products.unshift({ name, price, quantity, desc, emoji: image ? "📦" : "✨", image, color });
      await saveProducts();
      renderProducts();
      renderAdminProducts();
      resetProductForm();
      if (productMessage) {
        productMessage.textContent = "Product added successfully.";
      }
    };

    if (photoFile && typeof photoFile !== "string" && photoFile.size > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        void finishProductSave(reader.result);
      };
      reader.readAsDataURL(photoFile);
      return;
    }

    await finishProductSave(editingProductName ? products.find((item) => item.name === editingProductName)?.image ?? null : null);
  });
}

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", resetProductForm);
}

if (logoutButton) {
  logoutButton.addEventListener("click", logoutAdmin);
}

if (resetOrdersButton) {
  resetOrdersButton.addEventListener("click", async () => {
    orders.length = 0;
    await saveOrders();
    renderAdminOrders();
    if (productMessage) {
      productMessage.textContent = "Orders reset successfully.";
    }
  });
}

if (adminProductList) {
  adminProductList.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    const name = button.dataset.name;

    if (action === "edit-product" && name) {
      const product = products.find((item) => item.name === name);
      if (product) {
        populateProductForm(product);
      }
      return;
    }

    if (action === "remove-product" && name) {
      products = products.filter((product) => product.name !== name);
      saveProducts();
      renderProducts();
      renderAdminProducts();
      if (editingProductName === name) {
        resetProductForm();
      }
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", logoutAdmin);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
  }
});

ensureAdminPage();
(async () => {
  await loadStoreData();
  if (productGrid) {
    renderProducts();
  }
  renderAdminProducts();
  renderAdminOrders();
  renderAllOrdersPage();
  updateCartDisplay();
  togglePaymentUI();
})();
