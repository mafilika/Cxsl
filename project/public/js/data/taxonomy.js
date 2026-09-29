export const CATEGORIES = [
  { id: "construction", name: "Construction" },
  { id: "electrical", name: "Electrical Services" },
  { id: "plumbing", name: "Plumbing" },
  { id: "roofing", name: "Roofing" },
  { id: "painting", name: "Painting" },
  { id: "waterproofing", name: "Waterproofing" },
  { id: "solar", name: "Solar Installation" },
  { id: "security", name: "Security Services" },
  { id: "cctv", name: "CCTV Installation" },
  { id: "aircon", name: "Air Conditioning" },
  { id: "coldrooms", name: "Cold Rooms & Refrigeration" },
  { id: "pools", name: "Swimming Pools" },
  { id: "renovations", name: "Renovations" },
  { id: "cleaning", name: "Cleaning Services" },
  { id: "landscaping", name: "Landscaping" },
  { id: "paving", name: "Paving" },
  { id: "carpentry", name: "Carpentry" },
  { id: "maintenance", name: "Property Maintenance" },
];

export const PROVINCES = [
  "Gauteng", "KwaZulu-Natal", "Western Cape", "Eastern Cape", "Mpumalanga",
  "Limpopo", "North West", "Free State", "Northern Cape",
];

export const CITIES_BY_PROVINCE = {
  Gauteng: ["Johannesburg", "Pretoria", "Randburg", "Sandton", "Centurion", "Midrand", "Soweto"],
  "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Umhlanga", "Ballito"],
  "Western Cape": ["Cape Town", "Stellenbosch", "George", "Paarl"],
  "Eastern Cape": ["Gqeberha", "East London", "Mthatha"],
  Mpumalanga: ["Nelspruit", "Witbank", "Secunda"],
  Limpopo: ["Polokwane", "Tzaneen", "Thohoyandou"],
  "North West": ["Rustenburg", "Klerksdorp", "Christiana", "Mahikeng"],
  "Free State": ["Bloemfontein", "Welkom"],
  "Northern Cape": ["Kimberley", "Upington"],
};

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, name: id };
}

export function slugify(str) {
  return String(str).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
