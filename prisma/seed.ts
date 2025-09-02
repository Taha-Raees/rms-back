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

  // Update the store owner's storeId to point to the newly created store
  await prisma.user.update({
    where: { id: storeOwner.id },
    data: { storeId: store.id }
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

  // Update the store to use a subscription package
  const updatedStore = await prisma.store.update({
    where: { id: store.id },
    data: {
      subscriptionPackageId: basicPackage.id,
    },
  });

  console.log('Updated store with subscription package:', updatedStore);
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
