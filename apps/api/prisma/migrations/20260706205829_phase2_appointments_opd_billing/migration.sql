-- CreateTable
CREATE TABLE "invoice" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "caseId" UUID,
    "patientId" UUID NOT NULL,
    "billNo" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refund" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "tpaId" UUID,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "chargeId" UUID,
    "name" TEXT NOT NULL,
    "standardCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "appliedCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'cash',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "apptNo" TEXT NOT NULL,
    "patientId" UUID NOT NULL,
    "caseId" UUID,
    "doctorId" UUID NOT NULL,
    "apptDate" TIMESTAMP(3) NOT NULL,
    "shift" TEXT,
    "slot" TEXT,
    "fees" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "source" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "liveConsult" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "alternateAddress" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_visit" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "opdNo" TEXT NOT NULL,
    "patientId" UUID NOT NULL,
    "caseId" UUID,
    "consultantId" UUID NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "symptomType" TEXT,
    "symptoms" TEXT,
    "note" TEXT,
    "isAntenatal" BOOLEAN NOT NULL DEFAULT false,
    "casualty" BOOLEAN NOT NULL DEFAULT false,
    "oldPatient" BOOLEAN NOT NULL DEFAULT false,
    "applyTpa" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT,
    "invoiceId" UUID,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "opd_visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_branchId_module_deletedAt_createdAt_idx" ON "invoice"("branchId", "module", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "invoice_caseId_idx" ON "invoice"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_branchId_billNo_key" ON "invoice"("branchId", "billNo");

-- CreateIndex
CREATE INDEX "invoice_item_invoiceId_idx" ON "invoice_item"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- CreateIndex
CREATE INDEX "appointment_branchId_apptDate_deletedAt_idx" ON "appointment"("branchId", "apptDate", "deletedAt");

-- CreateIndex
CREATE INDEX "appointment_doctorId_apptDate_idx" ON "appointment"("doctorId", "apptDate");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_branchId_apptNo_key" ON "appointment"("branchId", "apptNo");

-- CreateIndex
CREATE INDEX "opd_visit_branchId_appointmentDate_deletedAt_idx" ON "opd_visit"("branchId", "appointmentDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opd_visit_branchId_opdNo_key" ON "opd_visit"("branchId", "opdNo");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "patient_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "patient_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_visit" ADD CONSTRAINT "opd_visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_visit" ADD CONSTRAINT "opd_visit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "patient_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_visit" ADD CONSTRAINT "opd_visit_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_visit" ADD CONSTRAINT "opd_visit_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
