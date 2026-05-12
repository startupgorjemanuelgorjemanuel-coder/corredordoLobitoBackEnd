-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('created', 'in_transit', 'at_border', 'customs_approved', 'customs_rejected', 'held', 'delivered');

-- CreateEnum
CREATE TYPE "CustomsStatus" AS ENUM ('pending', 'approved', 'rejected', 'held');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'created',
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "eta" TIMESTAMP(3),
    "documents" JSONB,
    "lastLocation" TEXT,
    "trackingEvents" JSONB,
    "holdReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_dispatches" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "status" "CustomsStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "rejectionReason" TEXT,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "customs_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customs_dispatches_shipmentId_key" ON "customs_dispatches"("shipmentId");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_dispatches" ADD CONSTRAINT "customs_dispatches_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_dispatches" ADD CONSTRAINT "customs_dispatches_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
