import { Product } from "@/src/types";
import seed from "@/database/seed.json";

// Pratos de todas as lojas. Cada prato aponta para a sua loja pelo campo restaurantId.
export const mockProducts: Product[] = seed.products;
