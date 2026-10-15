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

// Banco de dados em memória sincronizado com os mocks do app
const categories = [
  { id: "1", name: "Lanches", icon: "fast-food-outline" },
  { id: "2", name: "Pizza", icon: "pizza-outline" },
  { id: "3", name: "Sushi", icon: "fish-outline" },
  { id: "4", name: "Brasileira", icon: "restaurant-outline" },
  { id: "5", name: "Italiano", icon: "wine-outline" },
];

let restaurants = [
  {
    id: "1",
    name: "Burger House",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    category: "Lanches",
    priceRange: "$$",
    rating: 4.8,
    reviewCount: 1245,
    deliveryTime: "30-45 min",
    deliveryFee: 5.99,
    isOpen: true,
    ownerEmail: "burgerhouse@foodrush.com.br",
  },
  {
    id: "2",
    name: "Pizza Bella",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    category: "Pizza",
    priceRange: "$$$",
    rating: 4.9,
    reviewCount: 890,
    deliveryTime: "40-55 min",
    deliveryFee: 7.5,
    isOpen: true,
  },
  {
    id: "3",
    name: "Sushi Master",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80",
    category: "Sushi",
    priceRange: "$$$$",
    rating: 4.7,
    reviewCount: 654,
    deliveryTime: "45-60 min",
    deliveryFee: 9.99,
    isOpen: true,
  },
  {
    id: "4",
    name: "Sabor da Terra",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
    category: "Brasileira",
    priceRange: "$$",
    rating: 4.6,
    reviewCount: 432,
    deliveryTime: "25-40 min",
    deliveryFee: 4.5,
    isOpen: true,
  },
  {
    id: "5",
    name: "Cantina d'Italia",
    image:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80",
    category: "Italiano",
    priceRange: "$$$",
    rating: 4.8,
    reviewCount: 520,
    deliveryTime: "35-50 min",
    deliveryFee: 6.0,
    isOpen: true,
  },
];

let products = [
  {
    id: "p1",
    restaurantId: "1",
    name: "X-Bacon Artesanal",
    description:
      "Blend bovino 160g, fatias crocantes de bacon, queijo cheddar derretido e alface fresca.",
    price: 28.9,
    category: "Hambúrgueres",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "p2",
    restaurantId: "1",
    name: "Batata Frita Rústica",
    description:
      "Batatas crocantes temperadas com alecrim, alho assado e páprica defumada.",
    price: 16.0,
    category: "Acompanhamentos",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "p3",
    restaurantId: "1",
    name: "Smash Duplo Cheddar",
    description:
      "Dois hambúrgueres smash de 80g, dobro de cheddar cremoso e cebola caramelizada.",
    price: 32.5,
    category: "Hambúrgueres",
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "p4",
    restaurantId: "2",
    name: "Pizza Margherita Especial",
    description:
      "Molho de tomate pelado italiano, mussarela de búfala, manjericão fresco e azeite.",
    price: 49.9,
    category: "Pizzas Tradicionais",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
  },
];

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
    id: `rest-${Date.now()}`,
    name: storeName,
    category,
    image: image || defaultImages[category] || defaultImages.Lanches,
    priceRange: "$$",
    rating: 5.0,
    reviewCount: 0,
    deliveryTime: deliveryTime || "30-45 min",
    deliveryFee: Number(deliveryFee) || 0,
    isOpen: true,
    address: address || "Endereço cadastrado",
    phone: phone || "",
    ownerEmail: ownerEmail || "",
    createdAt: new Date().toISOString(),
  };

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
  if (!name || !price) {
    return res.status(400).json({ error: "Nome e preço são obrigatórios para o produto." });
  }

  const newProduct = {
    id: `prod-${Date.now()}`,
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

app.get("/api/orders", (req, res) => {
  res.json(inMemoryOrders);
});

app.post("/api/orders", (req, res) => {
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
