-- Adicionar 'staff_validated' ao enum ProductStatus
-- Este valor representa: PRODUCER submeteu → STAFF validou → aguarda STATE
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'staff_validated';
