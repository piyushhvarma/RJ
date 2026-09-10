import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Jewellery Re-categorization (Gold & Silver Separation) ---');

  // 1. Silver Payal
  const res1 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Silver Payal', "purityKarat" = 'Silver 80%'
    WHERE (description ILIKE '%payal%' OR description ILIKE '%poyal%' OR description ILIKE '%paijan%')
      AND description NOT ILIKE '%gold%';
  `);
  console.log('Updated Silver Payal:', res1);

  // 2. Silver Kada
  const res2 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Silver Kada', "purityKarat" = 'Silver 80%'
    WHERE (description ILIKE '%kada%' OR description ILIKE '%chada%' OR description ILIKE '%toda%')
      AND description NOT ILIKE '%gold%';
  `);
  console.log('Updated Silver Kada:', res2);

  // 3. Silver Patali
  const res3 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Silver Patali', "purityKarat" = 'Silver 80%'
    WHERE description ILIKE '%patali%'
      AND description NOT ILIKE '%gold%';
  `);
  console.log('Updated Silver Patali:', res3);

  // 4. Silver Bracelet
  const res4 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Silver Bracelet', "purityKarat" = 'Silver 80%'
    WHERE (description ILIKE '%braslet%' OR description ILIKE '%bracelet%')
      AND description NOT ILIKE '%gold%';
  `);
  console.log('Updated Silver Bracelet:', res4);

  // 5. Any other silver items (chandi, bichiya, jodvi, silver)
  const res5 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Silver Ornaments', "purityKarat" = 'Silver 80%'
    WHERE (description ILIKE '%chandi%' OR description ILIKE '%bichiya%' OR description ILIKE '%jodvi%' OR description ILIKE '%silver%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Silver Ornaments:', res5);

  // 6. Gold Mani / Dorle
  const res6 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Mani / Dorle'
    WHERE (description ILIKE '%dorle%' OR description ILIKE '%mani%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Mani / Dorle:', res6);

  // 7. Gold Earrings / Tops
  const res7 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Earrings / Tops'
    WHERE (description ILIKE '%tops%' OR description ILIKE '%bali%' OR description ILIKE '%zumka%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Earrings / Tops:', res7);

  // 8. Gold Ring
  const res8 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Ring'
    WHERE (description ILIKE '%anghuthi%' OR description ILIKE '%ring%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Ring:', res8);

  // 9. Gold Mangalsutra / Ekdani
  const res9 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Mangalsutra / Ekdani'
    WHERE (description ILIKE '%mangalsutra%' OR description ILIKE '%mangulsutra%' OR description ILIKE '%ekdani%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Mangalsutra:', res9);

  // 10. Gold Chain / Gof
  const res10 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Chain'
    WHERE (description ILIKE '%chain%' OR description ILIKE '%gof%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Chain:', res10);

  // 11. Gold Necklace / Pendant / Har
  const res11 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Necklace / Pendant'
    WHERE (description ILIKE '%har%' OR description ILIKE '%padak%' OR description ILIKE '%pendal%' OR description ILIKE '%locket%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Necklace:', res11);

  // 12. Gold Bangles
  const res12 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Bangles'
    WHERE (description ILIKE '%bangal%' OR description ILIKE '%bangle%')
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Bangles:', res12);

  // 13. Gold Nath
  const res13 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Nath'
    WHERE description ILIKE '%nath%'
      AND category NOT LIKE 'Silver%';
  `);
  console.log('Updated Gold Nath:', res13);

  // 14. Remaining Legacy Jewellery -> Gold Jewellery
  const res14 = await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET category = 'Gold Jewellery'
    WHERE category = 'Legacy Jewellery';
  `);
  console.log('Updated Remaining Gold Jewellery:', res14);

  // Standardize Gold 80% to '20K (80%)', 90% to '22K (91.6%)', 95% to '24K (95%)'
  await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET "purityKarat" = '20K (80%)'
    WHERE category NOT LIKE 'Silver%' AND "purityKarat" = '80%';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET "purityKarat" = '22K (91.6%)'
    WHERE category NOT LIKE 'Silver%' AND "purityKarat" = '90%';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE jewellery_items 
    SET "purityKarat" = '24K (95%)'
    WHERE category NOT LIKE 'Silver%' AND "purityKarat" = '95%';
  `);

  console.log('--- Checking Final Category Distribution ---');
  const counts = await prisma.jewelleryItem.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
