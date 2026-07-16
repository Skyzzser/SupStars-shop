import { PrismaClient } from "@prisma/client";
import {
  PREMIUM_PRICE_RUB,
  PREMIUM_PRICE_USD,
  STARS_MIN_QUANTITY,
  STARS_PRICE_RUB,
  STARS_PRICE_USD,
} from "@suupstars/shared";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { type: "stars" },
    update: {
      title: "Telegram Stars",
      description: "Покупка Telegram Stars от 50 штук. Выдача выполняется вручную после подтверждения оплаты.",
      minQuantity: STARS_MIN_QUANTITY,
      priceRub: STARS_PRICE_RUB,
      priceUsd: STARS_PRICE_USD,
      isActive: true,
    },
    create: {
      type: "stars",
      title: "Telegram Stars",
      description: "Покупка Telegram Stars от 50 штук. Выдача выполняется вручную после подтверждения оплаты.",
      minQuantity: STARS_MIN_QUANTITY,
      priceRub: STARS_PRICE_RUB,
      priceUsd: STARS_PRICE_USD,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { type: "premium" },
    update: {
      title: "Telegram Premium",
      description: "Telegram Premium для аккаунта получателя. Выдача подтверждается администратором после оплаты.",
      minQuantity: 1,
      priceRub: PREMIUM_PRICE_RUB,
      priceUsd: PREMIUM_PRICE_USD,
      isActive: true,
    },
    create: {
      type: "premium",
      title: "Telegram Premium",
      description: "Telegram Premium для аккаунта получателя. Выдача подтверждается администратором после оплаты.",
      minQuantity: 1,
      priceRub: PREMIUM_PRICE_RUB,
      priceUsd: PREMIUM_PRICE_USD,
      isActive: true,
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
