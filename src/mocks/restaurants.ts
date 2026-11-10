import { Restaurant } from "@/src/types";
import seed from "@/database/seed.json";

// Lista de restaurantes compartilhada com o servidor (database/seed.json).
export const mockRestaurants: Restaurant[] = seed.restaurants;
