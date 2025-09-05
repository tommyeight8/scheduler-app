// prisma/seed.ts
import { prisma } from "@/lib/prisma";

async function main() {
  const services = [
    { name: "Gel Manicure", priceCents: 4500, durationMin: 60 },
    { name: "Acrylic Full Set", priceCents: 6500, durationMin: 75 },
    { name: "Acrylic Fill", priceCents: 5000, durationMin: 60 },
    { name: "Classic Pedicure", priceCents: 5000, durationMin: 60 },
    { name: "Deluxe Spa Pedicure", priceCents: 7000, durationMin: 75 },
    { name: "Dip Powder Manicure", priceCents: 5500, durationMin: 60 },
    { name: "SNS Manicure", priceCents: 5500, durationMin: 60 },
    { name: "Nail Art (simple, per nail)", priceCents: 500, durationMin: 5 },
    { name: "Nail Art (detailed, per nail)", priceCents: 800, durationMin: 8 },
    { name: "Add Polish Change (hands)", priceCents: 2000, durationMin: 30 },
    { name: "Add Polish Change (toes)", priceCents: 2500, durationMin: 35 },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { name: svc.name },
      update: {},
      create: svc,
    });
  }
}

main()
  .then(() => console.log("✅ Services seeded"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
