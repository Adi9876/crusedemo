-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LIMIT', 'MARKET', 'STOP');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "side" "OrderSide" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "price" DECIMAL(28,18),
    "stopPrice" DECIMAL(28,18),
    "lockedUsdtPerUnit" DECIMAL(28,18),
    "amount" DECIMAL(28,18) NOT NULL,
    "filledAmount" DECIMAL(28,18) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(28,18) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(28,18) NOT NULL,
    "amount" DECIMAL(28,18) NOT NULL,
    "makerOrderId" UUID NOT NULL,
    "takerOrderId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_symbol_status_idx" ON "Order"("symbol", "status");

-- CreateIndex
CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");

-- CreateIndex
CREATE INDEX "Trade_buyerId_idx" ON "Trade"("buyerId");

-- CreateIndex
CREATE INDEX "Trade_sellerId_idx" ON "Trade"("sellerId");

-- CreateIndex
CREATE INDEX "Trade_createdAt_idx" ON "Trade"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_makerOrderId_fkey" FOREIGN KEY ("makerOrderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_takerOrderId_fkey" FOREIGN KEY ("takerOrderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
