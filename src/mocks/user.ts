import { User } from "@/src/types";

export const mockUser: User = {
  id: "u1",
  name: "Policarpo",
  lastName: "de Sousa",
  email: "policarpo.sousa@foodrush.com.br",
  phone: "(98) 98765-4321",
  address: "Rua das Flores, 123, Bairro Centro, Santa Inês - MA",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
  addresses: [
    {
      id: "addr-1",
      label: "Casa",
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Centro",
      city: "Santa Inês - MA",
      isDefault: true,
    },
    {
      id: "addr-2",
      label: "Trabalho",
      street: "Av. Castelo Branco",
      number: "450",
      neighborhood: "Centro",
      city: "Santa Inês - MA",
      isDefault: false,
    },
  ],
  savedPaymentMethods: [
    {
      id: "pay-1",
      type: "credit",
      title: "Cartão de Crédito",
      details: "Mastercard •••• 4829",
      isDefault: true,
    },
    {
      id: "pay-2",
      type: "pix",
      title: "Pix",
      details: "Chave CPF cadastrada",
      isDefault: false,
    },
  ],
  notifications: {
    orderUpdates: true,
    promotions: true,
    whatsappUpdates: false,
  },
};

