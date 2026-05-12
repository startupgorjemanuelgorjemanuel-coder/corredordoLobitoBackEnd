-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('pending', 'under_review', 'active', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "CompanyCountry" AS ENUM ('angola', 'zambia', 'drc', 'tanzania', 'zimbabwe', 'mozambique');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" "CompanyCountry" NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "address" TEXT,
    "licenseStatus" "LicenseStatus" NOT NULL DEFAULT 'pending',
    "licenseNumber" TEXT,
    "licenseExpiresAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "suspensionReason" TEXT,
    "validationNotes" TEXT,
    "approvedByStateId" TEXT,
    "validatedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
