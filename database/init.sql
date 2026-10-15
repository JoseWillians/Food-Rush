-- ====================================================================
-- FOOD RUSH - Schema de Banco de Dados Relacional (PostgreSQL)
-- ====================================================================

-- Criação de extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(30),
    avatar VARCHAR(255),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'partner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(60) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE RESTAURANTES / LOJAS
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE PRODUTOS / ITENS DO CARDÁPIO
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

-- 5. TABELA DE ENTREGADORES
CREATE TABLE IF NOT EXISTS couriers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    vehicle VARCHAR(40) DEFAULT 'Motocicleta',
    rating NUMERIC(2, 1) DEFAULT 4.9,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    courier_id VARCHAR(64) REFERENCES couriers(id) ON DELETE SET NULL,
    status VARCHAR(40) DEFAULT 'placed' CHECK (
        status IN ('placed', 'preparing', 'out_for_delivery', 'arriving', 'delivered', 'cancelled')
    ),
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    coupon_code VARCHAR(40),
    estimated_time VARCHAR(40) DEFAULT '20-30 min',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE AVALIAÇÕES
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
    courier_rating INTEGER CHECK (courier_rating BETWEEN 1 AND 5),
    tags TEXT[],
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ====================================================================
-- SEEDS INICIAIS (CATEGORIAS, RESTAURANTES, PRODUTOS E ENTREGADOR)
-- ====================================================================

-- Categorias
INSERT INTO categories (id, name, slug, icon) VALUES
('1', 'Lanches', 'lanches', 'fast-food-outline'),
('2', 'Pizza', 'pizza', 'pizza-outline'),
('3', 'Sushi', 'sushi', 'fish-outline'),
('4', 'Brasileira', 'brasileira', 'restaurant-outline'),
('5', 'Italiano', 'italiano', 'wine-outline')
ON CONFLICT (id) DO NOTHING;

-- Usuários Padrão (Cliente demo e Empreendedor demo)
INSERT INTO users (id, name, last_name, email, role) VALUES
('u-demo-customer', 'Carlos', 'Eduardo', 'carlos@foodrush.com.br', 'customer'),
('u-demo-partner', 'Marcos', 'Silva', 'burgerhouse@foodrush.com.br', 'partner')
ON CONFLICT (id) DO NOTHING;

-- Entregador Padrão
INSERT INTO couriers (id, name, phone, vehicle, rating) VALUES
('c-policarpo', 'Policarpo de Sousa', '(98) 98765-4321', 'Honda CG 160 Fan', 4.9)
ON CONFLICT (id) DO NOTHING;

-- Restaurantes Padrão
INSERT INTO restaurants (id, owner_id, name, image, category, price_range, rating, review_count, delivery_time, delivery_fee) VALUES
('1', 'u-demo-partner', 'Burger House', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 'Lanches', '$$', 4.8, 1245, '30-45 min', 5.99),
('2', NULL, 'Pizza Bella', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80', 'Pizza', '$$$', 4.9, 890, '40-55 min', 7.50),
('3', NULL, 'Sushi Master', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80', 'Sushi', '$$$$', 4.7, 654, '45-60 min', 9.99),
('4', NULL, 'Sabor da Terra', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80', 'Brasileira', '$$', 4.6, 432, '25-40 min', 4.50),
('5', NULL, 'Cantina d''Italia', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80', 'Italiano', '$$$', 4.8, 520, '35-50 min', 6.00)
ON CONFLICT (id) DO NOTHING;

-- Produtos
INSERT INTO products (id, restaurant_id, name, description, image, price, category) VALUES
('p1', '1', 'X-Bacon Artesanal', 'Blend bovino 160g, fatias crocantes de bacon, queijo cheddar derretido e alface fresca.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', 28.90, 'Hambúrgueres'),
('p2', '1', 'Batata Frita Rústica', 'Batatas crocantes temperadas com alecrim, alho assado e páprica defumada.', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80', 16.00, 'Acompanhamentos'),
('p3', '1', 'Smash Duplo Cheddar', 'Dois hambúrgueres smash de 80g, dobro de cheddar cremoso e cebola caramelizada.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80', 32.50, 'Hambúrgueres'),
('p4', '2', 'Pizza Margherita Especial', 'Molho de tomate pelado italiano, mussarela de búfala, manjericão fresco e azeite.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80', 49.90, 'Pizzas Tradicionais')
ON CONFLICT (id) DO NOTHING;

