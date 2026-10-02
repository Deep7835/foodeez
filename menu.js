// ============================================================
//  FOODEEZ — settings & menu data. Edit this file to change
//  prices, phone number, UPI ID, etc. No coding needed elsewhere.
// ============================================================

window.FOODEEZ_CONFIG = {
  brand: "Foodeez",
  tagline: "Cart to Yummy, Always Yummy!",
  whatsapp: "917303859375",          // orders go here (country code, no +)
  phoneDisplay: "+91 73038 59375",
  address: "Opp. Cleo County, Noida Sector 121",

  // ---- Payments ----
  // UPI: put your shop's UPI ID (a merchant/business UPI ID works best).
  upiId: "8941927137@okbizaxis",     // Foodeez Google Pay for Business
  upiName: "Foodeez",
  upiMerchantCode: "5812",           // from your GPay business QR (restaurants)
  // Razorpay (optional): paste your *Key ID* (rzp_live_... or rzp_test_...) to
  // enable card / netbanking / wallet payments in a popup. Leave "" to hide.
  razorpayKey: "",
  allowCash: true,                   // "Pay at counter" option

  deliveryFee: 0,                    // set e.g. 20 for delivery orders

  // ---- Social & offers ----
  instagram: "https://www.instagram.com/foodeez_on_wheels/",
  googleReview: "https://search.google.com/local/writereview?placeid=ChIJwQeIt0rvDDkRMZnb5cN0aVU",
  // Coupon codes. pct = % off on items. unlock = customer must tap Follow/Review first.
  // minOrder / maxOff are optional (0 = no limit). Add your own codes here, e.g. WELCOME10.
  coupons: {
    FOLLOW10: { pct: 10, minOrder: 0, maxOff: 0, unlock: "instagram", label: "Followed on Instagram" },
    REVIEW10: { pct: 10, minOrder: 0, maxOff: 0, unlock: "review",    label: "Reviewed on Google" },
  },
  defaultLocation: "cart",           // which menu opens if QR has no ?loc=
};

// Category photos (put your own photos in /img and change the file names)
const IMG = {
  steam: "img/steam.jpg",
  fried: "img/fried.jpg",
  kurkure: "img/kurkure.jpg",
  gravy: "img/steam.jpg",
  tandoori: "img/fried.jpg",
  butter: "img/steam.jpg",
};

const CATEGORIES = [
  { id: "steam",    name: "Steam Momo",          desc: "Soft, juicy & steamed fresh" },
  { id: "fried",    name: "Fried Momo",          desc: "Golden & crispy outside" },
  { id: "kurkure",  name: "Kurkure Momo",        desc: "Extra crunchy coated momos" },
  { id: "gravy",    name: "Gravy Momo",          desc: "Tossed in spicy rich gravy" },
  { id: "tandoori", name: "Tandoori Fried Momo", desc: "Smoky tandoori masala" },
  { id: "butter",   name: "Butter / Cream Momo", desc: "Creamy, buttery & mild" },
];

// Items in each category. "dough" items let customer choose Aata / Oats / Ragi.
const ITEMS = [
  { key: "veg",         name: "Veg Momos" },
  { key: "paneer",      name: "Paneer Momos" },
  { key: "cheesecorn",  name: "Cheese Corn Momo" },
  { key: "aataveg",     name: "Aata / Oats / Ragi Veg",    dough: true, healthy: true },
  { key: "aatapaneer",  name: "Aata / Oats / Ragi Paneer", dough: true, healthy: true },
  { key: "popcorn",     name: "Popcorn Momos", single: true },
];

// Bestseller badges (same on both menus)
const BEST = {
  steam: ["veg", "paneer", "aataveg"],
  fried: ["veg", "paneer"],
  kurkure: ["veg"],
  gravy: ["paneer"],
  tandoori: ["veg", "aataveg"],
  butter: ["veg", "paneer", "cheesecorn"],
};

// Prices: [Half, Full]. Popcorn is a single price. null = not on this menu.
// Two menus: "cart" (food cart, has Popcorn) and "shop".
const PRICES = {
  cart: {
    label: "Foodeez Cart",
    steam:    { veg:[70,120],  paneer:[80,140],  cheesecorn:[80,150],  aataveg:[90,170],  aatapaneer:[100,180], popcorn:120 },
    fried:    { veg:[80,150],  paneer:[90,170],  cheesecorn:[100,180], aataveg:[100,180], aatapaneer:[110,200], popcorn:150 },
    kurkure:  { veg:[90,170],  paneer:[100,190], cheesecorn:[110,200], aataveg:[110,200], aatapaneer:[120,210], popcorn:200 },
    gravy:    { veg:[90,170],  paneer:[100,190], cheesecorn:[110,200], aataveg:[110,200], aatapaneer:[120,210], popcorn:200 },
    tandoori: { veg:[90,170],  paneer:[100,190], cheesecorn:[110,200], aataveg:[110,200], aatapaneer:[120,210], popcorn:200 },
    butter:   { veg:[90,170],  paneer:[100,190], cheesecorn:[110,200], aataveg:[110,200], aatapaneer:[120,210], popcorn:200 },
  },
  shop: {
    label: "Foodeez Shop",
    steam:    { veg:[70,120],  paneer:[80,140],  cheesecorn:[90,160],  aataveg:[100,180], aatapaneer:[110,190], popcorn:null },
    fried:    { veg:[90,160],  paneer:[100,180], cheesecorn:[110,190], aataveg:[110,190], aatapaneer:[120,210], popcorn:null },
    kurkure:  { veg:[100,180], paneer:[110,200], cheesecorn:[120,210], aataveg:[120,210], aatapaneer:[130,220], popcorn:null },
    gravy:    { veg:[100,180], paneer:[110,200], cheesecorn:[120,210], aataveg:[120,210], aatapaneer:[130,220], popcorn:null },
    tandoori: { veg:[100,180], paneer:[110,200], cheesecorn:[120,210], aataveg:[120,210], aatapaneer:[130,220], popcorn:null },
    butter:   { veg:[100,180], paneer:[110,200], cheesecorn:[120,210], aataveg:[120,210], aatapaneer:[130,220], popcorn:null },
  },
};

window.FOODEEZ_MENU = { IMG, CATEGORIES, ITEMS, BEST, PRICES };
