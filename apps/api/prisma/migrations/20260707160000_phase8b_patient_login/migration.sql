-- Link a patient to an optional portal login account
ALTER TABLE "patient" ADD COLUMN "userId" UUID;
CREATE UNIQUE INDEX "patient_userId_key" ON "patient"("userId");
ALTER TABLE "patient" ADD CONSTRAINT "patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
