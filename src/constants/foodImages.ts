// Galeria de fotos de comida usada no cadastro de pratos e lojas.
// O dono da loja escolhe uma foto, e o app sugere uma automaticamente
// procurando palavras-chave no nome e na categoria do prato.

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&auto=format&fit=crop&q=80`;

export type FoodImage = {
  id: string;
  label: string;
  url: string;
  keywords: string[]; // sem acento e em minúsculas
};

// A ordem importa: os mais específicos vêm primeiro
// (ex.: "batata" é testada antes de "lanche").
export const FOOD_IMAGES: FoodImage[] = [
  { id: "acai", label: "Açaí", url: unsplash("1553530666-ba11a7da3888"), keywords: ["acai", "cupuacu", "smoothie"] },
  { id: "sorvete", label: "Sorvete", url: unsplash("1497034825429-c343d7c6a68f"), keywords: ["sorvete", "gelato", "picole", "casquinha"] },
  { id: "cafe", label: "Café", url: unsplash("1509042239860-f550ce710b93"), keywords: ["cafe", "cappuccino", "capuccino", "expresso", "espresso"] },
  { id: "suco", label: "Sucos", url: unsplash("1505252585461-04db1eb84625"), keywords: ["suco", "vitamina", "milkshake", "shake", "limonada"] },
  { id: "refri", label: "Refrigerante", url: unsplash("1622483767028-3f66f32aef97"), keywords: ["refri", "coca", "guarana", "lata", "agua", "bebida"] },
  { id: "petisco", label: "Salgados", url: unsplash("1606491956689-2ea866880c84"), keywords: ["pao de queijo", "salgado", "coxinha", "pastel", "petisco", "esfiha"] },
  { id: "batata", label: "Batata frita", url: unsplash("1573080496219-bb080dd4f877"), keywords: ["batata", "fritas", "porcao", "acompanhamento"] },
  { id: "espeto", label: "Espetinho", url: unsplash("1599487488170-d11ec9c172f0"), keywords: ["espet"] },
  { id: "frango", label: "Frango", url: unsplash("1626645738196-c2a7c87a8f58"), keywords: ["frango", "chicken", "asinha", "galeto"] },
  { id: "poke", label: "Poke / Bowl", url: unsplash("1546069901-ba9599a7e63c"), keywords: ["poke", "bowl"] },
  { id: "salada", label: "Salada", url: unsplash("1512621776951-a57141f2eefd"), keywords: ["salada", "fit", "vegano", "vegetariano", "saudavel"] },
  { id: "lamen", label: "Lámen / Sopa", url: unsplash("1617421753170-46511a8d73fc"), keywords: ["lamen", "ramen", "sopa", "caldo", "yakisoba"] },
  { id: "sushi", label: "Sushi", url: unsplash("1553621042-f6e147245754"), keywords: ["sushi", "combinado", "temaki", "sashimi", "niguiri", "hossomaki", "uramaki", "japones"] },
  { id: "pizza", label: "Pizza", url: unsplash("1534308983496-4fabb1a015ee"), keywords: ["pizza", "calabresa", "margherita", "mussarela"] },
  { id: "massa", label: "Massa", url: unsplash("1574894709920-11b28e7367e3"), keywords: ["massa", "lasanha", "macarr", "espaguete", "penne", "talharim", "nhoque", "italian"] },
  { id: "arroz", label: "Prato feito", url: unsplash("1512058564366-18510be2db19"), keywords: ["arroz", "feijo", "prato feito", "marmita", "baiao", "executivo"] },
  { id: "carne", label: "Carne", url: unsplash("1600891964092-4316c288032e"), keywords: ["picanha", "carne", "file", "bife", "costela", "churrasco", "brasileira"] },
  { id: "burger", label: "Hambúrguer", url: unsplash("1553979459-d2229ba7433b"), keywords: ["hamburg", "burger", "x-", "lanche", "sanduiche", "smash"] },
  { id: "sobremesa", label: "Sobremesa", url: unsplash("1571877227200-a0d98ea607e9"), keywords: ["sobremesa", "doce", "bolo", "torta", "pudim", "mousse", "tiramis", "brownie"] },
];

// Foto usada quando nada combina com o nome do prato
export const DEFAULT_FOOD_IMAGE = FOOD_IMAGES.find((f) => f.id === "poke")!.url;

/** "Pão de Queijo" -> "pao de queijo" (sem acentos e em minúsculas) */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function findByText(text: string): FoodImage | undefined {
  const clean = normalize(text);
  if (!clean.trim()) return undefined;
  return FOOD_IMAGES.find((img) => img.keywords.some((k) => clean.includes(k)));
}

/**
 * Sugere a foto do prato: primeiro pelo nome, depois pela categoria do prato
 * e por último pela categoria da loja.
 * A sugestão pode errar (ex.: "Pizza de Frango" cai em "frango", que vem antes
 * na lista), por isso o dono sempre pode trocar a foto na galeria.
 */
export function suggestFoodImage(
  productName: string,
  productCategory = "",
  storeCategory = ""
): string {
  return (
    findByText(productName)?.url ??
    findByText(productCategory)?.url ??
    findByText(storeCategory)?.url ??
    DEFAULT_FOOD_IMAGE
  );
}

// Foto de capa da loja de acordo com a categoria escolhida no cadastro
export const STORE_IMAGES: Record<string, string> = {
  Lanches: unsplash("1568901346375-23c9450c58cd"),
  Pizza: unsplash("1513104890138-7c749659a591"),
  Sushi: unsplash("1579871494447-9811cf80d66c"),
  Brasileira: unsplash("1555396273-367ea4eb4db5"),
  Italiano: unsplash("1551183053-bf91a1d81141"),
  Sobremesas: unsplash("1571877227200-a0d98ea607e9"),
  Bebidas: unsplash("1505252585461-04db1eb84625"),
};

export function storeImageFor(category: string): string {
  return STORE_IMAGES[category] ?? STORE_IMAGES.Brasileira;
}

/** true se a foto da loja é uma das fotos padrão (e não uma escolhida pelo dono) */
export function isDefaultStoreImage(url?: string): boolean {
  return !url || Object.values(STORE_IMAGES).includes(url) || url.includes("1555396273-367ea4eb4db5");
}
