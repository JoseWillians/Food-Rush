import { Product } from "@/src/types";

export const mockProducts: Product[] = [
  {
    id: "p1",
    restaurantId: "1",
    name: "X-Bacon Artesanal",
    description: "Pão brioche tostado na manteiga, blend bovino 160g, fatias crocantes de bacon, queijo cheddar derretido e alface fresca.",
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80",
    price: 28.9,
    category: "Hambúrgueres",
  },
  {
    id: "p2",
    restaurantId: "1",
    name: "Duplo Cheddar Melt",
    description: "Dois smash burgers de 100g, generosa camada de cheddar cremoso e cebola caramelizada.",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80",
    price: 32.5,
    category: "Hambúrgueres",
  },
  {
    id: "p3",
    restaurantId: "1",
    name: "Batata Frita Rústica",
    description: "Batatas crocantes temperadas com alecrim, alho assado e páprica defumada.",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80",
    price: 16.0,
    category: "Acompanhamentos",
  },
  {
    id: "p4",
    restaurantId: "1",
    name: "Refrigerante Lata 350ml",
    description: "Coca-Cola, Guaraná Antarctica ou Fanta Laranja gelada.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
    price: 6.5,
    category: "Bebidas",
  },
  {
    id: "p5",
    restaurantId: "2",
    name: "Pizza Calabresa Especial",
    description: "Massa artesanal de fermentação lenta, molho de tomate pelado, mussarela, calabresa defumada e cebola.",
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80",
    price: 54.9,
    category: "Pizzas Salgadas",
  },
  {
    id: "p6",
    restaurantId: "2",
    name: "Pizza Quatro Queijos",
    description: "Mussarela, provolone, gorgonzola e parmesão gratinado com orégano fresco.",
    image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&auto=format&fit=crop&q=80",
    price: 59.9,
    category: "Pizzas Salgadas",
  },
];

