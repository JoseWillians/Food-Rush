const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(express.json());

// Middleware de CORS para permitir requisições do app mobile (Expo Go, emulador e web)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Tentativa de conexão com o PostgreSQL se a variável DATABASE_URL estiver configurada
let dbPool = null;
if (DATABASE_URL) {
  try {
    const { Pool } = require("pg");
    dbPool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 3000,
    });
    dbPool.query("SELECT NOW()", (err, res) => {
      if (err) {
        console.warn("[FOOD RUSH DB] Conexão com PostgreSQL não disponível no momento. Usando armazenamento em memória.", err.message);
        dbPool = null;
      } else {
        console.log("[FOOD RUSH DB] Conectado ao PostgreSQL com sucesso:", res.rows[0].now);
      }
    });
  } catch (e) {
    console.log("[FOOD RUSH DB] Módulo 'pg' não carregado. Operando com armazenamento em memória.");
  }
}

// Servir arquivos estáticos se a pasta public existir
app.use(express.static(path.join(__dirname, "public")));

// Dados iniciais em memória. Vêm de database/seed.json, o mesmo arquivo que o app
// usa quando o servidor está desligado. Assim app e servidor nunca ficam diferentes.
const seed = require("./database/seed.json");

const categories = seed.categories;

let restaurants = seed.restaurants.map((r) => ({ ...r, isOpen: true }));

let products = [...seed.products];

let reviews = [...seed.reviews];

let inMemoryOrders = [
  {
    id: "ord-1001",
    restaurantId: "1",
    restaurantName: "Burger House",
    restaurantImage:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    items: [
      {
        id: "p1",
        quantity: 2,
        product: products[0],
      },
    ],
    subtotal: 57.8,
    deliveryFee: 5.99,
    total: 63.79,
    createdAt: new Date().toISOString(),
    status: "out_for_delivery",
    deliveryAddress: "Rua das Flores, 123, Centro",
    paymentMethod: "pix",
    courierName: "Policarpo de Sousa",
    courierRating: 4.9,
  },
];

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    app: "FOOD RUSH - API Server & Database",
    status: "online",
    database: dbPool ? "connected (PostgreSQL)" : "in-memory (Resilient)",
    message: "Servidor backend do Food Rush rodando com sucesso!",
    endpoints: [
      "/api/restaurants",
      "/api/products",
      "/api/categories",
      "/api/orders",
      "/api/restaurants/:id/reviews",
      "/api/restaurants/:id/status",
      "/api/partners/register",
    ],
  });
});

// Endpoints REST
app.get("/api/categories", (req, res) => {
  res.json(categories);
});

app.get("/api/restaurants", (req, res) => {
  const { category } = req.query;
  if (category) {
    const filtered = restaurants.filter(
      (r) => r.category.toLowerCase() === String(category).toLowerCase()
    );
    return res.json(filtered);
  }
  res.json(restaurants);
});

app.get("/api/restaurants/:id", (req, res) => {
  const rest = restaurants.find((r) => r.id === req.params.id);
  if (!rest) return res.status(404).json({ error: "Restaurante não encontrado" });
  res.json(rest);
});

app.get("/api/products", (req, res) => {
  const { restaurantId } = req.query;
  if (restaurantId) {
    const filtered = products.filter((p) => p.restaurantId === restaurantId);
    return res.json(filtered);
  }
  res.json(products);
});

// Cadastro de Empreendedor / Nova Loja
app.post("/api/partners/register", (req, res) => {
  const {
    ownerName,
    ownerEmail,
    storeName,
    category,
    deliveryTime,
    deliveryFee,
    address,
    phone,
    image,
  } = req.body;

  if (!storeName || !category) {
    return res.status(400).json({ error: "Nome da loja e categoria são obrigatórios." });
  }

  const defaultImages = {
    Lanches: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    Pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    Sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80",
    Brasileira: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
    Italiano: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80",
  };

  const newRestaurant = {
    id: req.body.id || `rest-${Date.now()}`, // o app manda o id que já usa
    name: storeName,
    category,
    image: image || defaultImages[category] || defaultImages.Lanches,
    priceRange: "$$",
    rating: 0, // loja nova começa sem nota
    reviewCount: 0,
    deliveryTime: deliveryTime || "30-45 min",
    deliveryFee: Number(deliveryFee) || 0,
    isOpen: true,
    address: address || "Endereço cadastrado",
    phone: phone || "",
    ownerEmail: ownerEmail || "",
    createdAt: new Date().toISOString(),
  };

  // Se a loja já existir (mesmo id), substitui em vez de duplicar
  restaurants = restaurants.filter((r) => r.id !== newRestaurant.id);
  restaurants.unshift(newRestaurant);
  console.log(`[FOOD RUSH API] Nova loja cadastrada: ${newRestaurant.name} (${newRestaurant.category}) por ${ownerName || ownerEmail}`);

  res.status(201).json(newRestaurant);
});

// Empreendedor adicionando produto ao cardápio de sua loja
app.post("/api/restaurants/:id/products", (req, res) => {
  const restaurantId = req.params.id;
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }

  const { name, description, price, category, image } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "O nome do produto é obrigatório." });
  }
  if (!(Number(price) > 0)) {
    return res.status(400).json({ error: "O preço deve ser um número maior que zero." });
  }

  const newProduct = {
    id: req.body.id || `prod-${Date.now()}`, // o app manda o id que já usa
    restaurantId,
    name,
    description: description || "",
    price: Number(price),
    category: category || "Destaques",
    image:
      image ||
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
  };

  products.push(newProduct);
  console.log(`[FOOD RUSH API] Novo produto adicionado à loja ${restaurant.name}: ${newProduct.name} - R$ ${newProduct.price}`);

  res.status(201).json(newProduct);
});

// Empreendedor editando os dados da loja
app.put("/api/restaurants/:id", (req, res) => {
  const restaurant = restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }
  const { name, category, deliveryTime, deliveryFee, image } = req.body;
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: "O nome da loja não pode ficar vazio." });
  }
  if (deliveryFee !== undefined && !(Number(deliveryFee) >= 0)) {
    return res.status(400).json({ error: "A taxa de entrega deve ser zero ou mais." });
  }
  Object.assign(restaurant, {
    ...(name !== undefined && { name }),
    ...(category !== undefined && { category }),
    ...(deliveryTime !== undefined && { deliveryTime }),
    ...(deliveryFee !== undefined && { deliveryFee: Number(deliveryFee) }),
    ...(image !== undefined && { image }),
  });
  res.json(restaurant);
});

// Empreendedor excluindo a loja (e os pratos dela)
app.delete("/api/restaurants/:id", (req, res) => {
  const exists = restaurants.some((r) => r.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }
  restaurants = restaurants.filter((r) => r.id !== req.params.id);
  products = products.filter((p) => p.restaurantId !== req.params.id);
  res.status(204).end();
});

// Empreendedor editando um prato
app.put("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  const { name, description, price, category, image } = req.body;
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: "O nome do produto é obrigatório." });
  }
  if (price !== undefined && !(Number(price) > 0)) {
    return res.status(400).json({ error: "O preço deve ser um número maior que zero." });
  }
  Object.assign(product, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: Number(price) }),
    ...(category !== undefined && { category }),
    ...(image !== undefined && { image }),
  });
  res.json(product);
});

// Empreendedor removendo um prato do cardápio
app.delete("/api/products/:id", (req, res) => {
  const exists = products.some((p) => p.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  products = products.filter((p) => p.id !== req.params.id);
  res.status(204).end();
});

// Empreendedor abrindo ou fechando a loja
app.patch("/api/restaurants/:id/status", (req, res) => {
  const restaurant = restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }
  restaurant.isOpen = Boolean(req.body.isOpen);
  res.json(restaurant);
});

// Avaliações de uma loja (as mais recentes primeiro)
app.get("/api/restaurants/:id/reviews", (req, res) => {
  const list = reviews.filter((r) => r.restaurantId === req.params.id);
  res.json(list);
});

// Cliente enviando uma avaliação: salva e recalcula a nota média da loja
app.post("/api/restaurants/:id/reviews", (req, res) => {
  const restaurant = restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }

  const { id, userName, rating, comment, date, orderId } = req.body;
  const nota = Number(rating);
  if (!nota || nota < 1 || nota > 5) {
    return res.status(400).json({ error: "A nota deve ser um número de 1 a 5." });
  }

  const newReview = {
    id: id || `rev-${Date.now()}`,
    restaurantId: restaurant.id,
    orderId,
    userName: userName || "Cliente",
    rating: nota,
    comment: comment || "",
    date: date || new Date().toLocaleDateString("pt-BR"),
  };
  reviews.unshift(newReview);

  // Nova média = (média antiga × quantidade antiga + nova nota) ÷ (quantidade + 1)
  const total = restaurant.rating * restaurant.reviewCount + nota;
  restaurant.reviewCount += 1;
  restaurant.rating = Math.round((total / restaurant.reviewCount) * 10) / 10;

  res.status(201).json(newReview);
});

app.get("/api/orders", (req, res) => {
  res.json(inMemoryOrders);
});

app.post("/api/orders", (req, res) => {
  const restaurant = restaurants.find((r) => r.id === req.body.restaurantId);
  if (restaurant && restaurant.isOpen === false) {
    return res.status(409).json({ error: "A loja está fechada e não aceita pedidos agora." });
  }
  const newOrder = {
    id: `ord-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "out_for_delivery",
    courierName: "Policarpo de Sousa",
    courierRating: 4.9,
    ...req.body,
  };
  inMemoryOrders.unshift(newOrder);
  console.log(`[FOOD RUSH API] Novo pedido recebido: ${newOrder.id} - Total: R$ ${newOrder.total}`);
  res.status(201).json(newOrder);
});

app.patch("/api/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const order = inMemoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  order.status = status;
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`[FOOD RUSH API] Servidor rodando em http://localhost:${PORT}`);
});
