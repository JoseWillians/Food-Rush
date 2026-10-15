import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/src/types";
import { mockUser } from "@/src/mocks/user";
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from "@/src/utils/storage";
import { api } from "@/src/services/api";

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (userData: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStorageUser() {
      try {
        const stored = await storageGet<User | null>(STORAGE_KEYS.AUTH_USER, null);
        if (stored) {
          setUser(stored);
        } else {
          // Usuário demo inicial logado para permitir navegação imediata de teste
          setUser(mockUser);
          await storageSet(STORAGE_KEYS.AUTH_USER, mockUser);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageUser();
  }, []);

  const signIn = async (email: string) => {
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const isDemo =
      !cleanEmail ||
      cleanEmail === mockUser.email.toLowerCase() ||
      cleanEmail === "cliente@foodrush.com";

    const userId = isDemo
      ? mockUser.id
      : `u-${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

    const loggedUser: User = isDemo
      ? { ...mockUser, email: cleanEmail || mockUser.email }
      : {
          id: userId,
          name: cleanEmail.split("@")[0] || "Cliente",
          lastName: "",
          email: cleanEmail,
          phone: "",
          address: "Endereço a cadastrar",
          avatar: mockUser.avatar,
          role: "customer",
          addresses: [],
          savedPaymentMethods: [],
          notifications: {
            orderUpdates: true,
            promotions: true,
            whatsappUpdates: true,
          },
        };

    setUser(loggedUser);
    await storageSet(STORAGE_KEYS.AUTH_USER, loggedUser);
  };

  const signUp = async (userData: Partial<User>) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: userData.name || "Novo Usuário",
      lastName: userData.lastName || "",
      email: userData.email || "usuario@foodrush.com.br",
      phone: userData.phone || "",
      address: userData.address || "Endereço cadastrado",
      avatar: mockUser.avatar,
      role: userData.role || "customer",
      store: userData.store,
      addresses: userData.addresses || [],
      savedPaymentMethods: userData.savedPaymentMethods || [],
      notifications: userData.notifications || {
        orderUpdates: true,
        promotions: true,
        whatsappUpdates: true,
      },
    };

    if (newUser.store) {
      await api.registerPartner({
        id: newUser.store.id,
        storeName: newUser.store.name,
        category: newUser.store.category,
        deliveryTime: newUser.store.deliveryTime,
        deliveryFee: newUser.store.deliveryFee,
        address: newUser.store.address,
        phone: newUser.store.phone,
        ownerName: `${newUser.name} ${newUser.lastName || ""}`.trim(),
        ownerEmail: newUser.email,
      });
    }

    setUser(newUser);
    await storageSet(STORAGE_KEYS.AUTH_USER, newUser);
  };

  const updateUser = async (userData: Partial<User>) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...userData } : ({ ...mockUser, ...userData } as User);
      storageSet(STORAGE_KEYS.AUTH_USER, updated);
      return updated;
    });

    if (userData.store) {
      await api.registerPartner({
        id: userData.store.id,
        storeName: userData.store.name,
        category: userData.store.category,
        deliveryTime: userData.store.deliveryTime,
        deliveryFee: userData.store.deliveryFee,
        address: userData.store.address,
        phone: userData.store.phone,
      });
    }
  };

  const signOut = async () => {
    setUser(null);
    await storageRemove(STORAGE_KEYS.AUTH_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}

