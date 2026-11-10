import { Category } from "@/src/types";
import seed from "@/database/seed.json";

// Os dados vêm de database/seed.json, o mesmo arquivo usado pelo server.js.
// Assim o app (modo offline) e o servidor mostram sempre as mesmas informações.
export const mockCategories: Category[] = seed.categories;
