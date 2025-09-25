import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.inventoryAlert.deleteMany(),
    prisma.paymentGateway.deleteMany(),
    prisma.webSocketEvent.deleteMany(),
    prisma.analyticsData.deleteMany(),
    prisma.subscriptionPackage.deleteMany(),
    prisma.store.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('Cleared all existing data');

  // Hash the password
  const hashedPassword = await bcrypt.hash('Soban-0343', 12);

  // Create super admin user
  const superAdmin = await prisma.user.create({
    data: {
      email: 'raeesmuhammadtaha@system.com',
      password: hashedPassword,
      name: 'Muhammad Taha Raees',
      role: 'SUPERADMIN',
    },
  });

  console.log('Created super admin user:', superAdmin);

  // Create sample stores with owners
  const storeOwner = await prisma.user.create({
    data: {
      email: 'ahmed@store.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Ahmed Khan',
      role: 'OWNER',
    },
  });

  // Create multiple stores
  const stores = [];

  // Store 1: General Store
  const store = await prisma.store.create({
    data: {
      name: 'Ahmed General Store',
      businessType: 'GENERAL',
      ownerId: storeOwner.id,
      street: '123 Main Street',
      city: 'Karachi',
      state: 'Sindh',
      postalCode: '74000',
      country: 'Pakistan',
      phone: '+92-300-1234567',
      email: 'ahmed@store.com',
      subscriptionPlan: 'Basic',
      subscriptionStatus: 'active',
      currency: 'PKR',
      currencySymbol: 'Rs.',
      taxRate: 0.17,
    },
  });
  stores.push(store);

  // Create owner for grocery store
  const groceryOwner = await prisma.user.create({
    data: {
      email: 'grocery@store.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Grocery Owner',
      role: 'OWNER',
    },
  });

  // Store 2: Grocery Store
  const groceryStore = await prisma.store.create({
    data: {
      name: 'Fresh Market Grocery',
      businessType: 'GROCERY',
      ownerId: groceryOwner.id,
      street: '456 Market Street',
      city: 'Karachi',
      state: 'Sindh',
      postalCode: '74000',
      country: 'Pakistan',
      phone: '+92-301-2345678',
      email: 'grocery@store.com',
      subscriptionPlan: 'Basic',
      subscriptionStatus: 'active',
      currency: 'PKR',
      currencySymbol: 'Rs.',
      taxRate: 0.17,
    },
  });
  stores.push(groceryStore);

  // Create owner for electronics store
  const electronicsOwner = await prisma.user.create({
    data: {
      email: 'electronics@store.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Electronics Owner',
      role: 'OWNER',
    },
  });

  // Store 3: Electronics Store
  const electronicsStore = await prisma.store.create({
    data: {
      name: 'Tech Hub Electronics',
      businessType: 'ELECTRONICS',
      ownerId: electronicsOwner.id,
      street: '789 Tech Street',
      city: 'Karachi',
      state: 'Sindh',
      postalCode: '74000',
      country: 'Pakistan',
      phone: '+92-302-3456789',
      email: 'electronics@store.com',
      subscriptionPlan: 'Basic',
      subscriptionStatus: 'active',
      currency: 'PKR',
      currencySymbol: 'Rs.',
      taxRate: 0.17,
    },
  });
  stores.push(electronicsStore);

  // Create owner for clothing store
  const clothingOwner = await prisma.user.create({
    data: {
      email: 'clothing@store.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Clothing Owner',
      role: 'OWNER',
    },
  });

  // Store 4: Clothing Store
  const clothingStore = await prisma.store.create({
    data: {
      name: 'Fashion Hub',
      businessType: 'CLOTHING',
      ownerId: clothingOwner.id,
      street: '321 Style Street',
      city: 'Karachi',
      state: 'Sindh',
      postalCode: '74000',
      country: 'Pakistan',
      phone: '+92-303-4567890',
      email: 'clothing@store.com',
      subscriptionPlan: 'Basic',
      subscriptionStatus: 'active',
      currency: 'PKR',
      currencySymbol: 'Rs.',
      taxRate: 0.17,
    },
  });
  stores.push(clothingStore);

  // Update owners' storeIds
  await prisma.user.update({
    where: { id: storeOwner.id },
    data: { storeId: store.id }
  });
  await prisma.user.update({
    where: { id: groceryOwner.id },
    data: { storeId: groceryStore.id }
  });
  await prisma.user.update({
    where: { id: electronicsOwner.id },
    data: { storeId: electronicsStore.id }
  });
  await prisma.user.update({
    where: { id: clothingOwner.id },
    data: { storeId: clothingStore.id }
  });

  // Create subscription packages
  const basicPackage = await prisma.subscriptionPackage.create({
    data: {
      name: 'Basic',
      price: 500,
      currency: 'PKR',
      description: 'Basic package for small stores',
      maxStores: 1,
      maxProducts: 100,
      maxUsers: 5,
      features: ['Inventory Management', 'Basic Reporting', 'Up to 100 products'],
      isActive: true,
      isDefault: true,
    },
  });

  const premiumPackage = await prisma.subscriptionPackage.create({
    data: {
      name: 'Premium',
      price: 1500,
      currency: 'PKR',
      description: 'Premium package for growing businesses',
      maxStores: 5,
      maxProducts: 1000,
      maxUsers: 20,
      features: ['Inventory Management', 'Advanced Reporting', 'Up to 1000 products', 'Multi-store support', 'Customer Management'],
      isActive: true,
      isDefault: false,
    },
  });

  const enterprisePackage = await prisma.subscriptionPackage.create({
    data: {
      name: 'Enterprise',
      price: 3000,
      currency: 'PKR',
      description: 'Enterprise package for large businesses',
      maxStores: -1, // Unlimited
      maxProducts: -1, // Unlimited
      maxUsers: -1, // Unlimited
      features: ['Inventory Management', 'Advanced Reporting', 'Unlimited products', 'Multi-store support', 'Customer Management', 'API Access', 'Priority Support'],
      isActive: true,
      isDefault: false,
    },
  });

  console.log('Created subscription packages:', { basicPackage, premiumPackage, enterprisePackage });

  // Update stores to use subscription packages
  for (const s of stores) {
    await prisma.store.update({
      where: { id: s.id },
      data: {
        subscriptionPackageId: basicPackage.id,
      },
    });
  }

  // Create products for Grocery Store
  const groceryProductConfigs = [
    {
      productData: { name: 'Rice Premium', category: 'Grains', basePrice: 150, baseCost: 120, stock: 50, unit: 'kg', lowStockThreshold: 10, type: 'branded_packet' as const },
      variants: [
        { name: '1kg Pack', weight: 1, weightUnit: 'kg', price: 150, cost: 120, stock: 30, sku: 'RICE-1KG' },
        { name: '5kg Pack', weight: 5, weightUnit: 'kg', price: 700, cost: 580, stock: 20, sku: 'RICE-5KG' },
      ]
    },
    {
      productData: { name: 'Cooking Oil', category: 'Oils', basePrice: 250, baseCost: 200, stock: 25, unit: 'L', lowStockThreshold: 8, type: 'branded_packet' as const },
      variants: [
        { name: '1L Bottle', weight: 1, weightUnit: 'L', price: 250, cost: 200, stock: 15, sku: 'OIL-1L' },
        { name: '5L Bottle', weight: 5, weightUnit: 'L', price: 1200, cost: 960, stock: 10, sku: 'OIL-5L' },
      ]
    },
    {
      productData: { name: 'Milk Whole', category: 'Dairy', basePrice: 120, baseCost: 100, stock: 40, unit: 'L', lowStockThreshold: 10, type: 'branded_packet' as const },
      variants: [
        { name: '500ml Carton', weight: 0.5, weightUnit: 'L', price: 65, cost: 55, stock: 25, sku: 'MILK-500ML' },
        { name: '1L Carton', weight: 1, weightUnit: 'L', price: 120, cost: 100, stock: 20, sku: 'MILK-1L' },
        { name: '2L Carton', weight: 2, weightUnit: 'L', price: 230, cost: 190, stock: 15, sku: 'MILK-2L' },
      ]
    },
    { productData: { name: 'Sugar White', category: 'Pantry', basePrice: 80, baseCost: 65, stock: 30, unit: 'kg', lowStockThreshold: 5, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Bread Wheat', category: 'Bakery', basePrice: 60, baseCost: 45, stock: 20, unit: 'loaf', lowStockThreshold: 5, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Eggs Fresh', category: 'Poultry', basePrice: 200, baseCost: 180, stock: 30, unit: 'dozen', lowStockThreshold: 8, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Apples Red', category: 'Fruits', basePrice: 180, baseCost: 150, stock: 35, unit: 'kg', lowStockThreshold: 7, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Potatoes', category: 'Vegetables', basePrice: 40, baseCost: 30, stock: 60, unit: 'kg', lowStockThreshold: 15, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Chicken Breast', category: 'Meat', basePrice: 300, baseCost: 280, stock: 15, unit: 'kg', lowStockThreshold: 10, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Tea Loose', category: 'Beverages', basePrice: 400, baseCost: 350, stock: 12, unit: 'kg', lowStockThreshold: 3, type: 'unit_based' as const }, variants: [] },
  ];

  const groceryProducts = [];
  for (const config of groceryProductConfigs) {
    const product = await prisma.product.create({
      data: {
        ...config.productData,
        storeId: groceryStore.id,
      },
    });
    groceryProducts.push({ product, variants: config.variants });

    // Create variants for this product
    for (const variant of config.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: variant.name,
          weight: variant.weight,
          weightUnit: variant.weightUnit,
          price: variant.price,
          cost: variant.cost,
          stock: variant.stock,
          sku: variant.sku,
        },
      });
    }
  }

  // Create products for Electronics Store
  const electronicsProductConfigs = [
    {
      productData: { name: 'Smartphone Basic', category: 'Mobile Phones', basePrice: 25000, baseCost: 22000, stock: 10, unit: 'piece', lowStockThreshold: 5, type: 'branded_packet' as const },
      variants: [
        { name: '32GB Black', price: 24000, cost: 21000, stock: 4, sku: 'PHONE-32GB-BLK' },
        { name: '64GB White', price: 26000, cost: 23000, stock: 3, sku: 'PHONE-64GB-WHT' },
        { name: '128GB Blue', price: 28000, cost: 25000, stock: 3, sku: 'PHONE-128GB-BLU' },
      ]
    },
    {
      productData: { name: 'USB Flash Drive', category: 'Storage', basePrice: 800, baseCost: 650, stock: 25, unit: 'piece', lowStockThreshold: 10, type: 'branded_packet' as const },
      variants: [
        { name: '16GB USB Drive', price: 500, cost: 400, stock: 10, sku: 'USB-16GB' },
        { name: '32GB USB Drive', price: 800, cost: 650, stock: 8, sku: 'USB-32GB' },
        { name: '64GB USB Drive', price: 1200, cost: 1000, stock: 7, sku: 'USB-64GB' },
      ]
    },
    {
      productData: { name: 'Power Bank', category: 'Accessories', basePrice: 1200, baseCost: 1000, stock: 12, unit: 'piece', lowStockThreshold: 5, type: 'branded_packet' as const },
      variants: [
        { name: '10000mAh Black', price: 1200, cost: 1000, stock: 5, sku: 'PB-10K-BLK' },
        { name: '10000mAh White', price: 1200, cost: 1000, stock: 4, sku: 'PB-10K-WHT' },
        { name: '20000mAh Black', price: 1800, cost: 1500, stock: 3, sku: 'PB-20K-BLK' },
      ]
    },
    { productData: { name: 'Laptop 15-inch', category: 'Computers', basePrice: 65000, baseCost: 60000, stock: 5, unit: 'piece', lowStockThreshold: 2, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Wireless Earbuds', category: 'Audio', basePrice: 3500, baseCost: 3000, stock: 20, unit: 'piece', lowStockThreshold: 5, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'LED TV 32"', category: 'Televisions', basePrice: 35000, baseCost: 32000, stock: 8, unit: 'piece', lowStockThreshold: 3, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Bluetooth Speaker', category: 'Audio', basePrice: 2500, baseCost: 2000, stock: 15, unit: 'piece', lowStockThreshold: 4, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Smart Watch Basic', category: 'Wearables', basePrice: 5500, baseCost: 4800, stock: 18, unit: 'piece', lowStockThreshold: 6, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Wireless Mouse', category: 'Computer Accessories', basePrice: 500, baseCost: 400, stock: 30, unit: 'piece', lowStockThreshold: 10, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'HDMI Cable 1.5m', category: 'Cables', basePrice: 300, baseCost: 250, stock: 20, unit: 'piece', lowStockThreshold: 8, type: 'unit_based' as const }, variants: [] },
  ];

  const electronicsProducts = [];
  for (const config of electronicsProductConfigs) {
    const product = await prisma.product.create({
      data: {
        ...config.productData,
        storeId: electronicsStore.id,
      },
    });
    electronicsProducts.push({ product, variants: config.variants });

    // Create variants for this product
    for (const variant of config.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: variant.name,
          price: variant.price,
          cost: variant.cost,
          stock: variant.stock,
          sku: variant.sku,
        },
      });
    }
  }

  // Create products for Clothing Store
  const clothingProductConfigs = [
    {
      productData: { name: 'T-Shirt Cotton White', category: 'T-Shirts', basePrice: 800, baseCost: 600, stock: 45, unit: 'piece', lowStockThreshold: 10, type: 'branded_packet' as const },
      variants: [
        { name: 'Size S', price: 750, cost: 550, stock: 12, sku: 'TSHIRT-WHT-S' },
        { name: 'Size M', price: 800, cost: 600, stock: 15, sku: 'TSHIRT-WHT-M' },
        { name: 'Size L', price: 800, cost: 600, stock: 10, sku: 'TSHIRT-WHT-L' },
        { name: 'Size XL', price: 850, cost: 650, stock: 8, sku: 'TSHIRT-WHT-XL' },
      ]
    },
    {
      productData: { name: 'Jeans Dark Blue', category: 'Pants', basePrice: 2500, baseCost: 2000, stock: 28, unit: 'piece', lowStockThreshold: 8, type: 'branded_packet' as const },
      variants: [
        { name: 'Size 30', price: 2400, cost: 1900, stock: 7, sku: 'JEANS-BLU-30' },
        { name: 'Size 32', price: 2500, cost: 2000, stock: 9, sku: 'JEANS-BLU-32' },
        { name: 'Size 34', price: 2500, cost: 2000, stock: 8, sku: 'JEANS-BLU-34' },
        { name: 'Size 36', price: 2600, cost: 2100, stock: 4, sku: 'JEANS-BLU-36' },
      ]
    },
    {
      productData: { name: 'Sneakers Casual', category: 'Shoes', basePrice: 3200, baseCost: 2600, stock: 22, unit: 'pair', lowStockThreshold: 6, type: 'branded_packet' as const },
      variants: [
        { name: 'Size 8', price: 3100, cost: 2500, stock: 5, sku: 'SNEAKERS-8' },
        { name: 'Size 9', price: 3200, cost: 2600, stock: 6, sku: 'SNEAKERS-9' },
        { name: 'Size 10', price: 3200, cost: 2600, stock: 7, sku: 'SNEAKERS-10' },
        { name: 'Size 11', price: 3300, cost: 2700, stock: 4, sku: 'SNEAKERS-11' },
      ]
    },
    { productData: { name: 'Jacket Winter', category: 'Outerwear', basePrice: 4200, baseCost: 3500, stock: 15, unit: 'piece', lowStockThreshold: 5, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Dress Floral', category: 'Dresses', basePrice: 1800, baseCost: 1400, stock: 18, unit: 'piece', lowStockThreshold: 7, type: 'unit_based' as const }, variants: [] },
    { productData: { name: 'Cap Baseball', category: 'Accessories', basePrice: 450, baseCost: 350, stock: 35, unit: 'piece', lowStockThreshold: 12, type: 'unit_based' as const }, variants: [] },
  ];

  const clothingProducts = [];
  for (const config of clothingProductConfigs) {
    const product = await prisma.product.create({
      data: {
        ...config.productData,
        storeId: clothingStore.id,
      },
    });
    clothingProducts.push({ product, variants: config.variants });

    // Create variants for this product
    for (const variant of config.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: variant.name,
          price: variant.price,
          cost: variant.cost,
          stock: variant.stock,
          sku: variant.sku,
        },
      });
    }
  }

  console.log(`Created ${groceryProducts.length} grocery products, ${electronicsProducts.length} electronics products, and ${clothingProducts.length} clothing products`);

  // Create sample orders for each store (5 orders per store for testing)
  console.log('Creating sample orders...');

  const storesWithProducts = [
    { store: groceryStore, products: groceryProducts, name: 'Grocery' },
    { store: electronicsStore, products: electronicsProducts, name: 'Electronics' },
    { store: clothingStore, products: clothingProducts, name: 'Clothing' },
  ];

  let totalOrdersCreated = 0;

  for (const { store, products, name } of storesWithProducts) {
    console.log(`Creating 5 orders for ${name} store...`);

    for (let i = 0; i < 5; i++) {
      // Random order date within last 60 days
      const randomDaysAgo = Math.floor(Math.random() * 60);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - randomDaysAgo);

      // Get all products and their variants for this store
      const storeProducts = products.map(p => ({
        product: p.product,
        variants: p.variants
      }));

      // Create order items first to calculate totals
      const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items
      let orderSubtotal = 0;
      const orderItemsData: any[] = [];

      for (let j = 0; j < numItems; j++) {
        const randomProductConfig = storeProducts[Math.floor(Math.random() * storeProducts.length)];
        const product = randomProductConfig.product;
        const variants = randomProductConfig.variants;

        let unitPrice: number;
        let variantId: string | undefined;

        // If product has variants, randomly choose one
        if (variants && variants.length > 0) {
          const randomVariant = variants[Math.floor(Math.random() * variants.length)];
          unitPrice = randomVariant.price;
          variantId = undefined; // We won't set variantId for this simple seed, but could be added
        } else {
          unitPrice = product.basePrice;
        }

        const quantity = Math.floor(Math.random() * 4) + 1; // 1-4 quantity
        const totalPrice = unitPrice * quantity;

        orderSubtotal += totalPrice;

        orderItemsData.push({
          productId: product.id,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          variantId: variantId,
        });
      }

      // Calculate tax and total
      const taxRate = store.taxRate || 0.17;
      const tax = Math.round(orderSubtotal * taxRate); // Round to nearest PKR
      const total = orderSubtotal + tax;

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-${store.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}-${orderDate.getFullYear()}`,
          storeId: store.id,
          subtotal: orderSubtotal,
          tax: tax,
          total: total,
          paymentMethod: 'cash',
          status: 'completed',
          createdAt: orderDate,
          updatedAt: orderDate,
        },
      });

      // Create order items
      for (const itemData of orderItemsData) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            ...itemData,
          },
        });
      }

      totalOrdersCreated++;
    }
  }

  console.log(`Created ${totalOrdersCreated} orders successfully!`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
