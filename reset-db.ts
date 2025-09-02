import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('Resetting database...');
  
  try {
    // Clear all data in the correct order to avoid foreign key constraints
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
      prisma.user.deleteMany(),
      prisma.store.deleteMany(),
    ]);

    console.log('Database cleared successfully!');
    console.log('You can now run the seed script with: pnpm prisma:seed');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
