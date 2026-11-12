const express = require("express");
const path = require("path");

const fs = require("fs");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Suporte a payloads JSON maiores para envio de fotos em base64
app.use(express.json({ limit: "15mb" }));

// Middleware de CORS para permitir requisições do app mobile (Expo Go, emulador e web)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Role, X-Store-Id"
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
  } catch {
    console.log("[FOOD RUSH DB] Módulo 'pg' não carregado. Operando com armazenamento em memória.");
  }
}

// Servir arquivos estáticos (incluindo diretório de uploads persistido)
const uploadsDir = path.join(__dirname, "public", "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn("[FOOD RUSH] Aviso ao criar pasta de uploads:", err.message);
}
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(path.join(__dirname, "public")));

// Dados iniciais em memória. Vêm de database/seed.json, o mesmo arquivo que o app
// usa quando o servidor está desligado. Assim app e servidor nunca ficam diferentes.
const seed = require("./database/seed.json");

const categories = seed.categories;
const estados = seed.estados || [{ id: "MA", name: "Maranhão", uf: "MA" }];
let cidades = seed.cidades || [{ id: "cid-santaines", estadoId: "MA", name: "Santa Inês", isActive: true }];
let bairros = [...(seed.bairros || [])];
let lojaTaxasBairro = [...(seed.lojaTaxasBairro || [])];
// Ganho do entregador no modelo do iFood: mínimo garantido por rota + valor por km
// rodado + bônus de promoção (mesma regra de src/utils/deliveryFee.ts)
let motoboyTaxasConfig = seed.motoboyTaxasConfig || {
  cityId: "cid-santaines",
  minPerRoute: 6.5,
  perKm: 1.5,
  promoBonus: 0,
  kmByZone: { central: 2, urbana: 3, periferica: 5, rural: 8 },
};

// Distância estimada pela zona do bairro (o app ainda não tem coordenadas)
function estimateDistanceKm(zone) {
  const table = motoboyTaxasConfig.kmByZone || { central: 2, urbana: 3, periferica: 5, rural: 8 };
  return table[zone] ?? table.urbana ?? 3;
}

function calculateCourierFee(zone) {
  const distanceKm = estimateDistanceKm(zone);
  const routeFee = Math.round((motoboyTaxasConfig.minPerRoute + motoboyTaxasConfig.perKm * distanceKm) * 100) / 100;
  const promoBonus = Number(motoboyTaxasConfig.promoBonus) || 0;
  return { distanceKm, routeFee, promoBonus, courierPayout: Math.round((routeFee + promoBonus) * 100) / 100 };
}
let couriers = [...(seed.couriers || [])];
let storeCouriers = [];

let restaurants = seed.restaurants.map((r) => ({
  ...r,
  isOpen: true,
  cityId: r.cityId || "cid-santaines",
  cityName: r.cityName || "Santa Inês",
  deliveryMode: r.deliveryMode || "own_courier",
}));

let products = [...seed.products];
let reviews = [...seed.reviews];
let serverAccounts = [];

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

// Persistência Resiliente em Disco (sobrevive a reinicializações de servidor e containers Docker)
const STATE_FILE_PATHS = [
  path.join(uploadsDir, ".foodrush-state.json"),
  path.join(__dirname, "database", "persistent-state.json"),
];

function loadPersistentState() {
  for (const filePath of STATE_FILE_PATHS) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        console.log(`[FOOD RUSH STATE] Estado carregado com sucesso de: ${filePath}`);
        return parsed;
      }
    } catch (err) {
      console.warn(`[FOOD RUSH STATE] Falha ao ler ${filePath}:`, err.message);
    }
  }
  return null;
}

function savePersistentState() {
  const state = {
    updatedAt: new Date().toISOString(),
    restaurants,
    products,
    couriers,
    storeCouriers,
    inMemoryOrders,
    reviews,
    accounts: serverAccounts,
    bairros,
    lojaTaxasBairro,
    motoboyTaxasConfig,
  };
  const json = JSON.stringify(state, null, 2);
  for (const filePath of STATE_FILE_PATHS) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, json, "utf-8");
    } catch {
      // Ignora erro em caminhos secundários
    }
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash };
}

function checkPassword(password, account) {
  const hash = crypto.scryptSync(password, account.salt, 64);
  const saved = Buffer.from(account.passwordHash, "hex");
  return saved.length === hash.length && crypto.timingSafeEqual(saved, hash);
}

// Carrega o estado salvo previamente, se existir
const savedState = loadPersistentState();
if (savedState) {
  if (Array.isArray(savedState.restaurants) && savedState.restaurants.length > 0) {
    restaurants = savedState.restaurants;
  }
  if (Array.isArray(savedState.products) && savedState.products.length > 0) {
    products = savedState.products;
  }
  if (Array.isArray(savedState.couriers) && savedState.couriers.length > 0) {
    couriers = savedState.couriers;
  }
  if (Array.isArray(savedState.storeCouriers)) {
    storeCouriers = savedState.storeCouriers;
  }
  if (Array.isArray(savedState.inMemoryOrders) && savedState.inMemoryOrders.length > 0) {
    inMemoryOrders = savedState.inMemoryOrders;
  }
  if (Array.isArray(savedState.reviews) && savedState.reviews.length > 0) {
    reviews = savedState.reviews;
  }
  if (Array.isArray(savedState.accounts)) {
    // Contas salvas por versões antigas tinham a senha aberta: converte para hash
    serverAccounts = savedState.accounts
      .filter((a) => a && a.user && a.user.email)
      .map((a) => (a.passwordHash ? a : { email: normalizeEmail(a.user.email), ...hashPassword(String(a.password || "")), user: a.user }));
  }
  if (Array.isArray(savedState.bairros) && savedState.bairros.length > 0) {
    bairros = savedState.bairros;
  }
  if (Array.isArray(savedState.lojaTaxasBairro) && savedState.lojaTaxasBairro.length > 0) {
    lojaTaxasBairro = savedState.lojaTaxasBairro;
  }
}

// Middleware de isolamento estrito de lojas (RBAC)
function verifyStoreOwnership(req, res, next) {
  // Pedidos DELETE não têm corpo: no Express 5 o req.body fica undefined
  const body = req.body || {};
  const userRole = req.headers["x-user-role"] || body.requesterRole;
  const requesterStoreId = req.headers["x-store-id"] || body.requesterStoreId;
  const targetStoreId = req.params.id || body.restaurantId;

  if (
    userRole === "partner" &&
    requesterStoreId &&
    targetStoreId &&
    requesterStoreId !== targetStoreId
  ) {
    return res.status(403).json({
      error: "Acesso negado: você só pode gerenciar e configurar a sua própria loja.",
    });
  }
  next();
}

// ====================================================================
// CONTAS DE USUÁRIO (clientes, empreendedores e entregadores)
// A senha nunca é salva nem devolvida: o servidor guarda só o hash (scrypt + salt).
// ====================================================================
function findServerAccount(email) {
  const e = normalizeEmail(email);
  return serverAccounts.find((a) => a.email === e);
}

// Cria a conta. Responde 409 se o e-mail já estiver cadastrado.
app.post("/api/auth/register", (req, res) => {
  const { password, user } = req.body || {};
  if (!user || !user.email || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Informe o usuário e uma senha com pelo menos 6 caracteres." });
  }
  if (findServerAccount(user.email)) {
    return res.status(409).json({ error: "Este e-mail já está cadastrado." });
  }
  serverAccounts.push({ email: normalizeEmail(user.email), ...hashPassword(password), user });
  savePersistentState();
  res.status(201).json({ ok: true });
});

// Confere e-mail e senha. Devolve só os dados do usuário.
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const account = email ? findServerAccount(email) : null;
  if (!account) {
    return res.status(404).json({ error: "Não existe conta com este e-mail." });
  }
  if (!checkPassword(String(password || ""), account)) {
    return res.status(401).json({ error: "Senha incorreta." });
  }
  res.json({ user: account.user });
});

// Atualiza os dados do perfil (nome, endereços, foto...). Não muda a senha.
app.put("/api/auth/users/:email", (req, res) => {
  const account = findServerAccount(req.params.email);
  if (!account) return res.status(404).json({ error: "Conta não encontrada." });
  const { user } = req.body || {};
  if (!user || normalizeEmail(user.email || "") !== account.email) {
    return res.status(400).json({ error: "Dados do usuário inválidos." });
  }
  account.user = user;
  savePersistentState();
  res.json({ ok: true });
});

// Redefine a senha. Como o app ainda não envia e-mail de confirmação, funciona
// igual à tela "Esqueceu a senha" do app; num app real exigiria um código por e-mail.
app.post("/api/auth/reset-password", (req, res) => {
  const { email, newPassword } = req.body || {};
  const account = email ? findServerAccount(email) : null;
  if (!account) return res.status(404).json({ error: "Não existe conta com este e-mail." });
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
  }
  Object.assign(account, hashPassword(newPassword));
  savePersistentState();
  res.json({ ok: true });
});

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

// ====================================================================
// UPLOAD DE IMAGENS (PERFIL, ALIMENTOS E RESTAURANTES COM PERSISTÊNCIA DOCKER)
// ====================================================================
app.post("/api/upload", (req, res) => {
  try {
    const { image, folder = "general" } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Campo 'image' em formato data-URL ou base64 é obrigatório." });
    }

    let mimeType = "image/jpeg";
    let base64Data = image;
    const matches = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: "Formato de imagem não suportado. Utilize JPEG, PNG ou WEBP." });
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "A imagem excede o tamanho máximo permitido de 5MB." });
    }

    const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
    // Só letras, números e hífen no prefixo: impede nomes como "../../arquivo"
    const safeFolder = String(folder).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) || "general";
    const filename = `${safeFolder}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${filename}`;
    console.log(`[FOOD RUSH UPLOAD] Imagem salva com sucesso: ${publicUrl} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return res.status(201).json({
      success: true,
      url: publicUrl,
      filename,
      size: buffer.length,
    });
  } catch (err) {
    console.error("[FOOD RUSH UPLOAD ERROR]", err);
    return res.status(500).json({ error: "Erro interno ao processar o upload da imagem." });
  }
});

// ====================================================================
// HIERARQUIA GEOGRÁFICA (ESTADOS, CIDADES E BAIRROS DE SANTA INÊS - MA)
// ====================================================================
app.get("/api/geo/states", (req, res) => {
  res.json(estados);
});

app.get("/api/geo/cities", (req, res) => {
  res.json(cidades);
});

app.get("/api/geo/cities/:id/neighborhoods", (req, res) => {
  const list = bairros.filter((b) => b.cidadeId === req.params.id);
  res.json(list);
});

app.post("/api/geo/cities/:id/neighborhoods", (req, res) => {
  const { name, zone } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Nome do bairro é obrigatório." });
  }
  const cleanName = String(name).trim();
  const existing = bairros.find(
    (b) => b.cidadeId === req.params.id && b.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: "Este bairro já está cadastrado nesta cidade.", bairro: existing });
  }

  const newBairro = {
    id: `b-${Date.now()}`,
    cidadeId: req.params.id,
    name: cleanName,
    zone: zone || "urbana",
  };
  bairros.push(newBairro);
  savePersistentState();
  console.log(`[FOOD RUSH GEO] Novo bairro cadastrado em Santa Inês: ${newBairro.name}`);
  res.status(201).json(newBairro);
});

// ====================================================================
// TAXAS DE ENTREGA DA LOJA POR BAIRRO
// ====================================================================
app.get("/api/restaurants/:id/delivery-rates", (req, res) => {
  const list = lojaTaxasBairro.filter((t) => t.restaurantId === req.params.id);
  res.json(list);
});

app.post("/api/restaurants/:id/delivery-rates", verifyStoreOwnership, (req, res) => {
  const { bairroId, deliveryFee, estimatedTime } = req.body;
  if (!bairroId) {
    return res.status(400).json({ error: "bairroId é obrigatório." });
  }
  const feeNum = Number(deliveryFee);
  if (isNaN(feeNum) || feeNum < 0) {
    return res.status(400).json({ error: "A taxa de entrega deve ser um número zero ou maior." });
  }

  const index = lojaTaxasBairro.findIndex(
    (t) => t.restaurantId === req.params.id && t.bairroId === bairroId
  );
  const rateData = {
    // Usa o id que o app já tem, para o app conseguir excluir a taxa depois
    id: index >= 0 ? lojaTaxasBairro[index].id : req.body.id || `tb-${req.params.id}-${Date.now()}`,
    restaurantId: req.params.id,
    bairroId,
    deliveryFee: feeNum,
    estimatedTime: estimatedTime || "30-45 min",
    isActive: true,
  };

  if (index >= 0) {
    lojaTaxasBairro[index] = rateData;
  } else {
    lojaTaxasBairro.push(rateData);
  }
  savePersistentState();
  res.status(201).json(rateData);
});

app.delete("/api/restaurants/:id/delivery-rates/:rateId", verifyStoreOwnership, (req, res) => {
  lojaTaxasBairro = lojaTaxasBairro.filter(
    (t) => !(t.restaurantId === req.params.id && (t.id === req.params.rateId || t.bairroId === req.params.rateId))
  );
  savePersistentState();
  res.status(204).end();
});

// ====================================================================
// MOTOR DE CÁLCULO DE TAXAS (MOTOBOYS AUTÔNOMOS E LOJAS)
// ====================================================================
app.get("/api/delivery/courier-config/:cityId", (req, res) => {
  res.json(motoboyTaxasConfig);
});

app.post("/api/delivery/calculate-fee", (req, res) => {
  const { restaurantId, bairroId, mode } = req.body;

  // 1. Caso seja entrega por motoboy próprio da loja
  if (mode === "own_courier" || !mode) {
    const customRate = lojaTaxasBairro.find(
      (t) => t.restaurantId === restaurantId && t.bairroId === bairroId
    );
    if (customRate) {
      return res.json({
        deliveryFee: customRate.deliveryFee,
        estimatedTime: customRate.estimatedTime,
        source: "store_fixed",
        courierFee: 0,
      });
    }
  }

  // 2. Cálculo para motoboys autônomos
  const bairro = bairros.find((b) => b.id === bairroId);
  const { distanceKm, routeFee, promoBonus, courierPayout } = calculateCourierFee(bairro && bairro.zone);

  return res.json({
    deliveryFee: routeFee, // o cliente paga o valor da rota
    estimatedTime: "25-40 min",
    source: "independent_courier",
    distanceKm,
    courierFee: courierPayout, // o entregador recebe a rota + bônus de promoção
    promoBonus,
  });
});

// ====================================================================
// ENTREGADORES / MOTOBOYS (PERFIL, STATUS, ENTREGAS E GANHOS)
// ====================================================================
app.get("/api/couriers", (req, res) => {
  res.json(couriers);
});

app.get("/api/couriers/:id", (req, res) => {
  const courier = couriers.find((c) => c.id === req.params.id || c.userId === req.params.id);
  if (!courier) return res.status(404).json({ error: "Entregador não encontrado." });
  res.json(courier);
});

app.patch("/api/couriers/:id/status", (req, res) => {
  let courier = couriers.find((c) => c.id === req.params.id || c.userId === req.params.id);
  if (!courier) {
    courier = {
      id: req.params.id,
      userId: req.params.id,
      name: req.body.name || "Entregador",
      phone: req.body.phone || "",
      vehicle: req.body.vehicle || "Moto",
      vehicleType: req.body.vehicleType || "moto",
      mode: req.body.mode || "independent",
      rating: 5.0,
      isActive: true,
      isOnline: Boolean(req.body.isOnline),
      totalDeliveries: 0,
      completedDeliveries: 0,
      totalEarnings: 0,
      todayEarnings: 0,
    };
    couriers.push(courier);
  } else {
    if (req.body.isOnline !== undefined) {
      courier.isOnline = Boolean(req.body.isOnline);
    }
  }
  courier.status = courier.isOnline ? "online" : "offline";
  savePersistentState();
  res.json(courier);
});

// Quanto o entregador ganha numa corrida: o valor gravado no pedido ou a regra pela zona
function courierPayoutOfOrder(order) {
  const bairro = bairros.find((b) => b.id === order.bairroId);
  return Number(order.courierFee) || calculateCourierFee(bairro && bairro.zone).courierPayout;
}

// Marca o pedido como entregue, seja o entregador ou o cliente quem confirmou.
// A comissão do entregador é calculada a partir dos pedidos entregues (ver /summary),
// então não há risco de pagar duas vezes ou de deixar de pagar.
function markDelivered(order) {
  if (order.status === "delivered") return;
  order.status = "delivered";
  order.deliveredAt = new Date().toISOString();
  if (order.courierId) order.courierFee = courierPayoutOfOrder(order);
}

// Resumo de ganhos do entregador, calculado a partir das corridas entregues
app.get("/api/couriers/:id/summary", (req, res) => {
  const today = new Date().toDateString();
  const delivered = inMemoryOrders.filter((o) => o.courierId === req.params.id && o.status === "delivered");
  const sum = (list) => Math.round(list.reduce((acc, o) => acc + courierPayoutOfOrder(o), 0) * 100) / 100;
  const todayList = delivered.filter((o) => o.deliveredAt && new Date(o.deliveredAt).toDateString() === today);
  res.json({
    totalDeliveries: delivered.length,
    totalEarnings: sum(delivered),
    todayDeliveries: todayList.length,
    todayEarnings: sum(todayList),
  });
});

// Corridas que o entregador aceitou e ainda não concluiu
app.get("/api/couriers/:id/active-orders", (req, res) => {
  const active = inMemoryOrders.filter(
    (o) =>
      o.courierId === req.params.id &&
      (o.status === "out_for_delivery" || o.status === "on_the_way" || o.status === "arriving")
  );
  res.json(active);
});

// Pedidos disponíveis para qualquer entregador da rede aceitar
app.get("/api/couriers/:id/available-orders", (req, res) => {
  const available = inMemoryOrders.filter(
    (o) =>
      (!o.courierId || o.courierRequested) &&
      !o.courierName &&
      (o.status === "ready" ||
        o.status === "ready_for_pickup" ||
        o.courierRequested ||
        (o.status === "preparing" && o.deliveryMode === "independent_couriers"))
  );
  res.json(available);
});

// Loja solicita / envia o pedido para entregadores autônomos da rede
app.post("/api/orders/:id/request-courier", (req, res) => {
  const order = inMemoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
  order.courierRequested = true;
  if (order.status === "placed" || order.status === "preparing") {
    order.status = "ready";
  }
  savePersistentState();
  console.log(`[FOOD RUSH DISPATCH] Pedido ${order.id} disponibilizado para entregadores da rede.`);
  res.json(order);
});

// Loja despacha o pedido com motoboy próprio
app.post("/api/restaurants/:id/orders/:orderId/assign-courier", verifyStoreOwnership, (req, res) => {
  const order = inMemoryOrders.find((o) => o.id === req.params.orderId && o.restaurantId === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado para esta loja." });
  const { courierId, courierName, courierPhone, vehicle } = req.body;
  order.courierId = courierId || `store-courier-${Date.now()}`;
  order.courierName = courierName || "Motoboy da Loja";
  order.courierPhone = courierPhone || "";
  order.vehicle = vehicle || "Moto";
  order.deliveryMode = "own_courier";
  order.status = "out_for_delivery";
  order.dispatchedAt = new Date().toISOString();
  savePersistentState();
  console.log(`[FOOD RUSH DISPATCH] Pedido ${order.id} despachado com motoboy próprio: ${order.courierName}`);
  res.json(order);
});

// Cadastro e Gestão de Motoboys Próprios da Loja
app.get("/api/restaurants/:id/couriers", (req, res) => {
  const list = storeCouriers.filter((c) => c.restaurantId === req.params.id);
  res.json(list);
});

app.post("/api/restaurants/:id/couriers", verifyStoreOwnership, (req, res) => {
  const { name, phone, vehicle, vehicleType, plate } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Nome e telefone do motoboy são obrigatórios." });
  }
  const newCourier = {
    id: req.body.id || `sc-${req.params.id}-${Date.now()}`,
    restaurantId: req.params.id,
    name: String(name).trim(),
    phone: String(phone).trim(),
    vehicle: vehicle || "Moto",
    vehicleType: vehicleType || "moto",
    plate: plate ? String(plate).trim() : "",
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  storeCouriers.push(newCourier);
  savePersistentState();
  console.log(`[FOOD RUSH STORE COURIER] Novo motoboy próprio cadastrado para loja ${req.params.id}: ${newCourier.name}`);
  res.status(201).json(newCourier);
});

app.delete("/api/restaurants/:id/couriers/:courierId", verifyStoreOwnership, (req, res) => {
  storeCouriers = storeCouriers.filter(
    (c) => !(c.restaurantId === req.params.id && c.id === req.params.courierId)
  );
  savePersistentState();
  res.status(204).end();
});

// Entregador da rede aceita a entrega do pedido
app.post("/api/orders/:id/accept-delivery", (req, res) => {
  const { courierId, courierName } = req.body;
  const order = inMemoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
  if (!courierId) return res.status(400).json({ error: "Informe o entregador." });
  if (order.courierId && order.courierId !== courierId) {
    return res.status(409).json({ error: "Outro entregador já aceitou esta corrida." });
  }
  if (order.status === "delivered" || order.status === "cancelled") {
    return res.status(409).json({ error: "Este pedido não está mais disponível." });
  }

  order.courierId = courierId;
  order.courierName = courierName || "Entregador Parceiro";
  order.status = "out_for_delivery";
  order.acceptedAt = new Date().toISOString();
  savePersistentState();
  console.log(`[FOOD RUSH DELIVERY] Pedido ${order.id} aceito pelo entregador ${order.courierName}`);
  res.json(order);
});

app.patch("/api/orders/:id/complete-delivery", (req, res) => {
  const order = inMemoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado." });

  const { courierId } = req.body || {};
  if (courierId && order.courierId && courierId !== order.courierId) {
    return res.status(403).json({ error: "Esta corrida é de outro entregador." });
  }
  if (order.status === "delivered") return res.json(order);

  markDelivered(order);
  savePersistentState();
  res.json(order);
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
    cityId: req.body.cityId || "cid-santaines",
    cityName: req.body.cityName || "Santa Inês",
    neighborhoodId: req.body.neighborhoodId || "b-centro",
    neighborhoodName: req.body.neighborhoodName || "Centro",
    deliveryMode: req.body.deliveryMode || "own_courier",
    createdAt: new Date().toISOString(),
  };

  // Se a loja já existir (mesmo id), substitui em vez de duplicar
  restaurants = restaurants.filter((r) => r.id !== newRestaurant.id);
  restaurants.unshift(newRestaurant);
  savePersistentState();
  console.log(`[FOOD RUSH API] Nova loja cadastrada: ${newRestaurant.name} (${newRestaurant.category}) por ${ownerName || ownerEmail}`);

  res.status(201).json(newRestaurant);
});

// Empreendedor adicionando produto ao cardápio de sua loja
app.post("/api/restaurants/:id/products", verifyStoreOwnership, (req, res) => {
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
  savePersistentState();
  console.log(`[FOOD RUSH API] Novo produto adicionado à loja ${restaurant.name}: ${newProduct.name} - R$ ${newProduct.price}`);

  res.status(201).json(newProduct);
});

// Empreendedor editando os dados da loja
app.put("/api/restaurants/:id", verifyStoreOwnership, (req, res) => {
  const restaurant = restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }
  const { name, category, deliveryTime, deliveryFee, deliveryMode, image } = req.body;
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
    ...(deliveryMode !== undefined && { deliveryMode }),
    ...(image !== undefined && { image }),
  });
  savePersistentState();
  res.json(restaurant);
});

// Empreendedor excluindo a loja (e os pratos dela)
app.delete("/api/restaurants/:id", verifyStoreOwnership, (req, res) => {
  const exists = restaurants.some((r) => r.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }
  restaurants = restaurants.filter((r) => r.id !== req.params.id);
  products = products.filter((p) => p.restaurantId !== req.params.id);
  savePersistentState();
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
  savePersistentState();
  res.json(product);
});

// Empreendedor removendo um prato do cardápio
app.delete("/api/products/:id", (req, res) => {
  const exists = products.some((p) => p.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }
  products = products.filter((p) => p.id !== req.params.id);
  savePersistentState();
  res.status(204).end();
});

// Empreendedor abrindo ou fechando a loja
app.patch("/api/restaurants/:id/status", verifyStoreOwnership, (req, res) => {
  const restaurant = restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: "Restaurante não encontrado" });
  }
  restaurant.isOpen = Boolean(req.body.isOpen);
  savePersistentState();
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
  savePersistentState();

  res.status(201).json(newReview);
});

app.get("/api/orders", (req, res) => {
  const { restaurantId } = req.query;
  if (restaurantId) {
    return res.json(inMemoryOrders.filter((o) => o.restaurantId === restaurantId));
  }
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
    status: req.body.status || "placed",
    ...req.body,
  };
  inMemoryOrders.unshift(newOrder);
  savePersistentState();
  console.log(`[FOOD RUSH API] Novo pedido recebido: ${newOrder.id} - Total: R$ ${newOrder.total}`);
  res.status(201).json(newOrder);
});

app.patch("/api/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const order = inMemoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  if (status === "delivered") {
    // Quem confirmou pode ser o cliente: o entregador recebe do mesmo jeito
    markDelivered(order);
  } else if (status) {
    order.status = status;
  }
  savePersistentState();
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`[FOOD RUSH API] Servidor rodando em http://localhost:${PORT}`);
});
