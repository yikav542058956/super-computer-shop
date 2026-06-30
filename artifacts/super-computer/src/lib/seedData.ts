import { ref, set, get } from "firebase/database";
import { db } from "@/lib/firebase";

export const seedData = async () => {
  const adminRef = ref(db, "users/admin");
  const snapshot = await get(adminRef);

  if (!snapshot.exists()) {
    console.log("Seeding database...");
    
    // Seed Users
    await set(ref(db, "users/admin"), {
      name: "Admin User",
      email: "admin@supercomputer.com",
      role: "admin"
    });

    // Seed Categories
    const categories = {
      "cat-1": { name: "Laptops", displayOrder: 1, image: "" },
      "cat-2": { name: "Gaming Laptops", displayOrder: 2, image: "" },
      "cat-3": { name: "Accessories", displayOrder: 3, image: "" }
    };
    await set(ref(db, "categories"), categories);

    // Seed Products
    const products = {
      "prod-1": {
        name: "Dell XPS 15",
        brand: "Dell",
        category: "cat-1",
        price: 150000,
        discountPrice: 145000,
        stock: 10,
        description: "Premium thin and light laptop.",
        specs: { processor: "Intel i7", ram: "16GB", storage: "512GB SSD" },
        images: ["/images/laptops/dell-xps.png"],
        rating: 4.8,
        reviewsCount: 120,
        isFeatured: true,
        isNewArrival: false,
        status: "active",
        createdAt: Date.now()
      },
      "prod-2": {
        name: "MacBook Pro 16",
        brand: "Apple",
        category: "cat-1",
        price: 250000,
        discountPrice: 240000,
        stock: 5,
        description: "The ultimate pro laptop.",
        specs: { processor: "M2 Pro", ram: "16GB", storage: "1TB SSD" },
        images: ["/images/laptops/macbook-pro.png"],
        rating: 4.9,
        reviewsCount: 300,
        isFeatured: true,
        isNewArrival: true,
        status: "active",
        createdAt: Date.now()
      },
      "prod-3": {
        name: "HP Spectre x360",
        brand: "HP",
        category: "cat-1",
        price: 135000,
        discountPrice: 130000,
        stock: 15,
        description: "Elegant 2-in-1 convertible.",
        specs: { processor: "Intel i7", ram: "16GB", storage: "1TB SSD" },
        images: ["/images/laptops/hp-spectre.png"],
        rating: 4.7,
        reviewsCount: 85,
        isFeatured: false,
        isNewArrival: true,
        status: "active",
        createdAt: Date.now()
      },
      "prod-4": {
        name: "Asus ROG Zephyrus",
        brand: "Asus",
        category: "cat-2",
        price: 180000,
        discountPrice: 175000,
        stock: 8,
        description: "High performance gaming.",
        specs: { processor: "Ryzen 9", ram: "32GB", storage: "1TB SSD", graphics: "RTX 4070" },
        images: ["/images/laptops/asus-rog.png"],
        rating: 4.8,
        reviewsCount: 210,
        isFeatured: true,
        isNewArrival: false,
        status: "active",
        createdAt: Date.now()
      },
      "prod-5": {
        name: "Lenovo ThinkPad X1",
        brand: "Lenovo",
        category: "cat-1",
        price: 160000,
        discountPrice: 155000,
        stock: 20,
        description: "The business standard.",
        specs: { processor: "Intel i7", ram: "16GB", storage: "512GB SSD" },
        images: ["/images/laptops/lenovo-thinkpad.png"],
        rating: 4.9,
        reviewsCount: 150,
        isFeatured: false,
        isNewArrival: false,
        status: "active",
        createdAt: Date.now()
      },
      "prod-6": {
        name: "MSI Stealth 15M",
        brand: "MSI",
        category: "cat-2",
        price: 145000,
        discountPrice: 140000,
        stock: 12,
        description: "Ultra-portable gaming laptop.",
        specs: { processor: "Intel i7", ram: "16GB", storage: "512GB SSD", graphics: "RTX 3060" },
        images: ["/images/laptops/msi-stealth.png"],
        rating: 4.6,
        reviewsCount: 95,
        isFeatured: true,
        isNewArrival: true,
        status: "active",
        createdAt: Date.now()
      }
    };
    await set(ref(db, "products"), products);

    // Seed Banners
    const banners = {
      "banner-1": {
        title: "Next-Gen Gaming Performance",
        subtitle: "Experience uncompromised power with the latest RTX 40-series laptops.",
        buttonText: "Shop Gaming",
        buttonLink: "/products?category=cat-2",
        imageUrl: "/images/banners/banner-1.png",
        order: 1,
        isActive: true
      },
      "banner-2": {
        title: "Premium Ultrabooks",
        subtitle: "Thin, light, and ready for anything. Upgrade your productivity today.",
        buttonText: "Explore Now",
        buttonLink: "/products?category=cat-1",
        imageUrl: "/images/banners/banner-2.png",
        order: 2,
        isActive: true
      }
    };
    await set(ref(db, "banners"), banners);

    // Seed Coupons
    await set(ref(db, "coupons/SAVE10"), {
      code: "SAVE10",
      discountType: "percentage",
      discountValue: 10,
      minOrderValue: 50000,
      isActive: true,
      maxUses: 100,
      usedCount: 0
    });

    console.log("Database seeded successfully!");
  }
};