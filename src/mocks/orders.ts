import { Order } from "@/src/types";

export const mockOrders: Order[] = [
  {
    id: "ord-101",
    restaurantId: "1",
    restaurantName: "Burger House",
    restaurantImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    items: [
      {
        id: "ci-1",
        quantity: 2,
        product: {
          id: "p1",
          restaurantId: "1",
          name: "X-Bacon Artesanal",
          description: "Blend bovino 160g, bacon crocante e queijo cheddar.",
          image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80",
          price: 28.9,
          category: "Hambúrgueres",
        },
      },
      {
        id: "ci-2",
        quantity: 1,
        product: {
          id: "p4",
          restaurantId: "1",
          name: "Refrigerante Lata 350ml",
          description: "Coca-Cola gelada.",
          image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
          price: 6.5,
          category: "Bebidas",
        },
      },
    ],
    subtotal: 64.3,
    deliveryFee: 5.99,
    total: 70.29,
    createdAt: "07 de out. de 2026 às 18:30",
    status: "out_for_delivery",
    deliveryAddress: "Rua das Flores, 123 - Santa Inês - MA",
    paymentMethod: "pix",
    courierName: "Policarpo de Sousa",
    courierRating: 4.9,
  },
  {
    id: "ord-100",
    restaurantId: "2",
    restaurantName: "Pizza Bella",
    restaurantImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    items: [
      {
        id: "ci-3",
        quantity: 1,
        product: {
          id: "p5",
          restaurantId: "2",
          name: "Pizza Calabresa Especial",
          description: "Massa artesanal, mussarela e calabresa defumada.",
          image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80",
          price: 54.9,
          category: "Pizzas Salgadas",
        },
      },
    ],
    subtotal: 54.9,
    deliveryFee: 7.5,
    total: 62.4,
    createdAt: "05 de out. de 2026 às 20:15",
    status: "delivered",
    deliveryAddress: "Rua das Flores, 123 - Santa Inês - MA",
    paymentMethod: "credit",
  },
];

