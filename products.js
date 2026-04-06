/**
 * Product database — maps barcodes to product info.
 * In production this would come from an API; here we use a local catalog.
 */
const PRODUCTS = {
  "8901234567890": { name: "Basmati Rice 1 kg",      price: 120.00, category: "Grocery" },
  "8901234567891": { name: "Whole Wheat Atta 5 kg",   price: 245.00, category: "Grocery" },
  "8901234567892": { name: "Sunflower Oil 1 L",       price: 165.00, category: "Grocery" },
  "8901234567893": { name: "Toor Dal 1 kg",           price: 140.00, category: "Grocery" },
  "8901234567894": { name: "Sugar 1 kg",              price: 48.00,  category: "Grocery" },
  "8901234567895": { name: "Salt 1 kg",               price: 22.00,  category: "Grocery" },
  "8901234567896": { name: "Tea 250 g",               price: 110.00, category: "Beverages" },
  "8901234567897": { name: "Coffee 200 g",            price: 220.00, category: "Beverages" },
  "8901234567898": { name: "Milk 500 ml",             price: 30.00,  category: "Dairy" },
  "8901234567899": { name: "Butter 100 g",            price: 55.00,  category: "Dairy" },
  "5901234123457": { name: "Chocolate Bar",           price: 85.00,  category: "Snacks" },
  "4006381333931": { name: "Ballpoint Pen",           price: 15.00,  category: "Stationery" },
  "0123456789012": { name: "Notebook 200 pages",      price: 60.00,  category: "Stationery" },
  "0123456789013": { name: "Hand Wash 250 ml",        price: 95.00,  category: "Personal Care" },
  "0123456789014": { name: "Toothpaste 150 g",        price: 78.00,  category: "Personal Care" },
  "0123456789015": { name: "Shampoo 200 ml",          price: 180.00, category: "Personal Care" },
  "0123456789016": { name: "Soap Bar (Pack of 3)",    price: 99.00,  category: "Personal Care" },
  "0123456789017": { name: "Biscuit Pack 300 g",      price: 40.00,  category: "Snacks" },
  "0123456789018": { name: "Chips 150 g",             price: 30.00,  category: "Snacks" },
  "0123456789019": { name: "Cold Drink 750 ml",       price: 40.00,  category: "Beverages" },
};
