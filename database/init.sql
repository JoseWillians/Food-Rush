-- ====================================================================
-- FOOD RUSH - Schema de Banco de Dados Relacional Avançado (PostgreSQL)
-- ====================================================================

-- Criação de extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. HIERARQUIA GEOGRÁFICA (ESTADOS -> CIDADES -> BAIRROS)
-- ====================================================================

-- Tabela de Estados
CREATE TABLE IF NOT EXISTS estados (
    id VARCHAR(2) PRIMARY KEY, -- UF (ex.: 'MA')
    name VARCHAR(80) NOT NULL,
    uf VARCHAR(2) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Cidades
CREATE TABLE IF NOT EXISTS cidades (
    id VARCHAR(64) PRIMARY KEY,
    estado_id VARCHAR(2) NOT NULL REFERENCES estados(id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    ibge_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Bairros
CREATE TABLE IF NOT EXISTS bairros (
    id VARCHAR(64) PRIMARY KEY,
    cidade_id VARCHAR(64) NOT NULL REFERENCES cidades(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    zone VARCHAR(40) DEFAULT 'urbana', -- 'central', 'norte', 'sul', 'leste', 'oeste', 'rural'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cidade_bairro UNIQUE (cidade_id, name)
);

-- ====================================================================
-- 2. TABELA DE USUÁRIOS (CLIENTES, LOJAS, ENTREGADORES E ADMINS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(30),
    avatar VARCHAR(255),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'partner', 'courier', 'admin')),
    city_id VARCHAR(64) REFERENCES cidades(id) ON DELETE SET NULL,
    neighborhood_id VARCHAR(64) REFERENCES bairros(id) ON DELETE SET NULL,
    vehicle_type VARCHAR(40), -- 'moto', 'bicicleta', 'carro' (para entregadores)
    vehicle_plate VARCHAR(20), -- Placa do veículo (para entregadores)
    courier_mode VARCHAR(30) DEFAULT 'independent', -- 'independent' (autônomo) ou 'store_partner'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 3. TABELA DE CATEGORIAS
-- ====================================================================
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(60) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 4. TABELA DE RESTAURANTES / LOJAS
-- ====================================================================
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    image TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    price_range VARCHAR(10) DEFAULT '$$',
    rating NUMERIC(2, 1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    delivery_time VARCHAR(40) DEFAULT '30-45 min',
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    is_open BOOLEAN DEFAULT true,
    address TEXT,
    phone VARCHAR(30),
    city_id VARCHAR(64) REFERENCES cidades(id) ON DELETE SET NULL,
    neighborhood_id VARCHAR(64) REFERENCES bairros(id) ON DELETE SET NULL,
    delivery_mode VARCHAR(30) DEFAULT 'own_courier' CHECK (delivery_mode IN ('own_courier', 'independent_couriers', 'both')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 5. TABELA DE TAXAS DE ENTREGA POR BAIRRO (LOJAS COM MOTOBOY PRÓPRIO)
-- ====================================================================
CREATE TABLE IF NOT EXISTS loja_taxas_bairro (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    bairro_id VARCHAR(64) NOT NULL REFERENCES bairros(id) ON DELETE CASCADE,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estimated_time VARCHAR(40) DEFAULT '30-45 min',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loja_bairro UNIQUE (restaurant_id, bairro_id)
);

-- ====================================================================
-- 6. TABELA DE PRODUTOS / ITENS DO CARDÁPIO
-- ====================================================================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    image TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    category VARCHAR(80) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 7. TABELA DE ENTREGADORES (MOTOBOYS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS couriers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    vehicle VARCHAR(40) DEFAULT 'Motocicleta',
    plate VARCHAR(20),
    mode VARCHAR(30) DEFAULT 'independent' CHECK (mode IN ('independent', 'store_partner')),
    store_id VARCHAR(64) REFERENCES restaurants(id) ON DELETE SET NULL,
    rating NUMERIC(2, 1) DEFAULT 4.9,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    current_lat NUMERIC(10, 6),
    current_lng NUMERIC(10, 6),
    total_deliveries INTEGER DEFAULT 0,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 8. CONFIGURAÇÃO DE TAXAS PARA MOTOBOYS AUTÔNOMOS
-- ====================================================================
CREATE TABLE IF NOT EXISTS motoboy_taxas_config (
    id VARCHAR(64) PRIMARY KEY,
    city_id VARCHAR(64) REFERENCES cidades(id) ON DELETE CASCADE,
    base_fee NUMERIC(10, 2) NOT NULL DEFAULT 6.00, -- Tarifa base (bandeirada)
    extra_per_zone NUMERIC(10, 2) NOT NULL DEFAULT 2.00, -- Adicional para zonas periféricas/distantes
    courier_payout_pct NUMERIC(5, 2) NOT NULL DEFAULT 85.00, -- Percentual repassado ao motoboy (85%)
    platform_fee_pct NUMERIC(5, 2) NOT NULL DEFAULT 15.00, -- Taxa da plataforma Food Rush (15%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 9. TABELA DE PEDIDOS
-- ====================================================================
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    courier_id VARCHAR(64) REFERENCES couriers(id) ON DELETE SET NULL,
    bairro_id VARCHAR(64) REFERENCES bairros(id) ON DELETE SET NULL,
    delivery_mode VARCHAR(30) DEFAULT 'own_courier' CHECK (delivery_mode IN ('own_courier', 'independent_courier')),
    status VARCHAR(40) DEFAULT 'placed' CHECK (
        status IN ('placed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'arriving', 'delivered', 'cancelled')
    ),
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    courier_fee NUMERIC(10, 2) DEFAULT 0.00,
    store_earning NUMERIC(10, 2) DEFAULT 0.00,
    delivery_address TEXT NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    coupon_code VARCHAR(40),
    estimated_time VARCHAR(40) DEFAULT '20-30 min',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 10. TABELA DE ITENS DO PEDIDO
-- ====================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 11. TABELA DE AVALIAÇÕES
-- ====================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    courier_id VARCHAR(64) REFERENCES couriers(id) ON DELETE SET NULL,
    restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
    courier_rating INTEGER CHECK (courier_rating BETWEEN 1 AND 5),
    tags TEXT[],
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_bairros_cidade ON bairros(cidade_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city_id);
CREATE INDEX IF NOT EXISTS idx_loja_taxas_restaurant ON loja_taxas_bairro(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loja_taxas_bairro ON loja_taxas_bairro(bairro_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_couriers_user ON couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_couriers_online ON couriers(is_online, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ====================================================================
-- SEEDS INICIAIS (ESTADOS, CIDADES, BAIRROS DE SANTA INÊS, CATEGORIAS, USUÁRIOS)
-- ====================================================================

-- 1. Estado do Maranhão
INSERT INTO estados (id, name, uf) VALUES
('MA', 'Maranhão', 'MA')
ON CONFLICT (id) DO NOTHING;

-- 2. Cidade de Santa Inês - MA
INSERT INTO cidades (id, estado_id, name, ibge_code, is_active) VALUES
('cid-santaines', 'MA', 'Santa Inês', '2109908', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Bairros Oficiais de Santa Inês - MA
INSERT INTO bairros (id, cidade_id, name, zone) VALUES
('b-centro', 'cid-santaines', 'Centro', 'central'),
('b-sabbak', 'cid-santaines', 'Sabbak', 'urbana'),
('b-vila-militar', 'cid-santaines', 'Vila Militar', 'urbana'),
('b-pq-santa-cruz', 'cid-santaines', 'Parque Santa Cruz', 'urbana'),
('b-canecao', 'cid-santaines', 'Canecão', 'urbana'),
('b-aeroporto', 'cid-santaines', 'Aeroporto', 'urbana'),
('b-jardim-brasilia', 'cid-santaines', 'Jardim Brasília', 'urbana'),
('b-nova-santa-ines', 'cid-santaines', 'Nova Santa Inês', 'urbana'),
('b-vila-adelaide-cabral', 'cid-santaines', 'Vila Adelaide Cabral', 'urbana'),
('b-bairro-novo', 'cid-santaines', 'Bairro Novo', 'urbana'),
('b-palmeira', 'cid-santaines', 'Palmeira', 'urbana'),
('b-santo-antonio', 'cid-santaines', 'Santo Antônio', 'urbana'),
('b-sao-benedito', 'cid-santaines', 'São Benedito', 'urbana'),
('b-coheb', 'cid-santaines', 'Coheb', 'urbana'),
('b-mutirao', 'cid-santaines', 'Mutirão', 'urbana'),
('b-sol-nascente', 'cid-santaines', 'Sol Nascente', 'urbana'),
('b-eco-ville', 'cid-santaines', 'Residencial Eco Ville', 'urbana'),
('b-conjunto-jucara', 'cid-santaines', 'Conjunto Juçara', 'urbana'),
('b-vila-marcony', 'cid-santaines', 'Vila Marcony', 'urbana'),
('b-laranjeiras', 'cid-santaines', 'Laranjeiras', 'urbana'),
('b-vila-conceicao', 'cid-santaines', 'Vila Conceição', 'urbana'),
('b-angelim', 'cid-santaines', 'Angelim', 'urbana'),
('b-barreiros', 'cid-santaines', 'Barreiros', 'urbana'),
('b-canaa', 'cid-santaines', 'Canaã', 'urbana'),
('b-jardim-abreu', 'cid-santaines', 'Jardim Abreu', 'urbana'),
('b-vila-edmundo-rios', 'cid-santaines', 'Vila Edmundo Rios', 'urbana'),
('b-vila-olimpica', 'cid-santaines', 'Vila Olímpica', 'urbana'),
('b-pq-buritis', 'cid-santaines', 'Parque dos Buritis', 'urbana'),
('b-morada-nova', 'cid-santaines', 'Morada Nova', 'urbana')
ON CONFLICT (cidade_id, name) DO NOTHING;

-- 4. Parâmetros de Motoboys Autônomos para Santa Inês
INSERT INTO motoboy_taxas_config (id, city_id, base_fee, extra_per_zone, courier_payout_pct, platform_fee_pct) VALUES
('cfg-santaines', 'cid-santaines', 6.00, 2.00, 85.00, 15.00)
ON CONFLICT (id) DO NOTHING;

-- 5. Categorias
INSERT INTO categories (id, name, slug, icon) VALUES
('1', 'Lanches', 'lanches', 'fast-food-outline'),
('2', 'Pizza', 'pizza', 'pizza-outline'),
('3', 'Sushi', 'sushi', 'fish-outline'),
('4', 'Brasileira', 'brasileira', 'restaurant-outline'),
('5', 'Italiano', 'italiano', 'wine-outline')
ON CONFLICT (id) DO NOTHING;

-- 6. Usuários Padrão (Cliente, Lojista e Entregador)
INSERT INTO users (id, name, last_name, email, role, city_id, neighborhood_id, vehicle_type, vehicle_plate, courier_mode) VALUES
('u-demo-customer', 'Carlos', 'Eduardo', 'carlos@foodrush.com.br', 'customer', 'cid-santaines', 'b-centro', NULL, NULL, NULL),
('u-demo-partner', 'Marcos', 'Silva', 'burgerhouse@foodrush.com.br', 'partner', 'cid-santaines', 'b-centro', NULL, NULL, NULL),
('u-demo-courier', 'Policarpo', 'de Sousa', 'policarpo@foodrush.com.br', 'courier', 'cid-santaines', 'b-centro', 'moto', 'NXR-2026', 'independent')
ON CONFLICT (id) DO NOTHING;

-- 7. Entregador Padrão
INSERT INTO couriers (id, user_id, name, phone, vehicle, plate, mode, rating, is_active, is_online, total_deliveries, total_earnings) VALUES
('c-policarpo', 'u-demo-courier', 'Policarpo de Sousa', '(98) 98765-4321', 'Honda CG 160 Fan', 'NXR-2026', 'independent', 4.9, true, true, 48, 384.00)
ON CONFLICT (id) DO NOTHING;

-- 8. Restaurantes Padrão (Localizados em Santa Inês - MA)
INSERT INTO restaurants (id, owner_id, name, image, category, price_range, rating, review_count, delivery_time, delivery_fee, city_id, neighborhood_id, delivery_mode) VALUES
('1', 'u-demo-partner', 'Burger House', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 'Lanches', '$$', 4.8, 1245, '30-45 min', 5.99, 'cid-santaines', 'b-centro', 'own_courier'),
('2', NULL, 'Pizza Bella', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80', 'Pizza', '$$$', 4.9, 890, '40-55 min', 7.50, 'cid-santaines', 'b-sabbak', 'independent_couriers'),
('3', NULL, 'Sushi Master', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80', 'Sushi', '$$$$', 4.7, 654, '45-60 min', 9.99, 'cid-santaines', 'b-pq-santa-cruz', 'both'),
('4', NULL, 'Sabor da Terra', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80', 'Brasileira', '$$', 4.6, 432, '25-40 min', 4.50, 'cid-santaines', 'b-canecao', 'own_courier'),
('5', NULL, 'Cantina d''Italia', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80', 'Italiano', '$$$', 4.8, 520, '35-50 min', 6.00, 'cid-santaines', 'b-jardim-brasilia', 'both')
ON CONFLICT (id) DO NOTHING;

-- 9. Taxas de Entrega da Loja 1 (Burger House) por Bairros de Santa Inês
INSERT INTO loja_taxas_bairro (id, restaurant_id, bairro_id, delivery_fee, estimated_time) VALUES
('tb-1-centro', '1', 'b-centro', 4.00, '20-30 min'),
('tb-1-sabbak', '1', 'b-sabbak', 5.00, '25-35 min'),
('tb-1-vila-militar', '1', 'b-vila-militar', 5.00, '25-35 min'),
('tb-1-pq-santa-cruz', '1', 'b-pq-santa-cruz', 6.00, '30-40 min'),
('tb-1-canecao', '1', 'b-canecao', 6.00, '30-40 min'),
('tb-1-aeroporto', '1', 'b-aeroporto', 7.00, '35-45 min'),
('tb-1-jardim-brasilia', '1', 'b-jardim-brasilia', 7.00, '35-45 min'),
('tb-1-nova-santa-ines', '1', 'b-nova-santa-ines', 8.00, '40-50 min'),
('tb-1-palmeira', '1', 'b-palmeira', 7.50, '35-45 min'),
('tb-1-coheb', '1', 'b-coheb', 8.00, '40-50 min')
ON CONFLICT (restaurant_id, bairro_id) DO NOTHING;

-- 10. Produtos do Cardápio
INSERT INTO products (id, restaurant_id, name, description, image, price, category) VALUES
('p1', '1', 'X-Bacon Artesanal', 'Pão brioche tostado na manteiga, blend bovino 160g, fatias crocantes de bacon, queijo cheddar derretido e alface fresca.', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80', 28.90, 'Hambúrgueres'),
('p2', '1', 'Batata Frita Rústica', 'Batatas rústicas com corte artesanal, temperadas com alecrim fresco, alho assado e páprica defumada.', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', 16.00, 'Acompanhamentos'),
('p3', '1', 'Smash Duplo Cheddar', 'Dois hambúrgueres smash ultra crocantes de 80g, dobro de cheddar cremoso derretido e cebola caramelizada.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', 32.50, 'Hambúrgueres'),
('p4', '2', 'Pizza Margherita Especial', 'Massa artesanal de fermentação lenta, molho de tomate pelado, mussarela de búfala, manjericão e azeite extravirgem.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80', 49.90, 'Pizzas Tradicionais')
ON CONFLICT (id) DO NOTHING;
