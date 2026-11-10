import { Review } from "@/src/types";
import seed from "@/database/seed.json";

// Avaliações de exemplo. O campo restaurantId diz a qual loja cada avaliação pertence.
export const mockReviews: Review[] = seed.reviews;
