-- CreateTable
CREATE TABLE "icd_group" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "icd_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd_code" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "groupId" UUID,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "icd_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "icd_group_branchId_deletedAt_idx" ON "icd_group"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "icd_code_branchId_deletedAt_idx" ON "icd_code"("branchId", "deletedAt");

-- AddForeignKey
ALTER TABLE "icd_code" ADD CONSTRAINT "icd_code_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "icd_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Starter ICD-10 catalog.
--
-- Seeded per existing branch so the Diagnosis cascade in OPD/IPD has
-- something to offer on day one. This is a representative slice of the
-- WHO chapters, not the full classification — the intent is that a
-- hospital extends it from Setup ▸ ICD-10 rather than starting empty.
-- Guarded on name/code so re-running against a seeded branch is a no-op.
DO $$
DECLARE
  b   RECORD;
  g   RECORD;
  gid UUID;
  seed_groups CONSTANT TEXT[][] := ARRAY[
    ['Certain infectious and parasitic diseases',           'A00-B99'],
    ['Neoplasms',                                           'C00-D49'],
    ['Endocrine, nutritional and metabolic diseases',       'E00-E89'],
    ['Mental and behavioural disorders',                    'F01-F99'],
    ['Diseases of the nervous system',                      'G00-G99'],
    ['Diseases of the circulatory system',                  'I00-I99'],
    ['Diseases of the respiratory system',                  'J00-J99'],
    ['Diseases of the digestive system',                    'K00-K95'],
    ['Pregnancy, childbirth and the puerperium',            'O00-O9A'],
    ['Injury, poisoning and external causes',               'S00-T88']
  ];
  seed_codes CONSTANT TEXT[][] := ARRAY[
    ['A00-B99', 'A09',   'Infectious gastroenteritis and colitis, unspecified'],
    ['A00-B99', 'A90',   'Dengue fever'],
    ['A00-B99', 'B54',   'Unspecified malaria'],
    ['E00-E89', 'E11.9', 'Type 2 diabetes mellitus without complications'],
    ['E00-E89', 'E78.5', 'Hyperlipidaemia, unspecified'],
    ['E00-E89', 'E03.9', 'Hypothyroidism, unspecified'],
    ['F01-F99', 'F32.9', 'Depressive episode, unspecified'],
    ['F01-F99', 'F41.9', 'Anxiety disorder, unspecified'],
    ['G00-G99', 'G43.9', 'Migraine, unspecified'],
    ['G00-G99', 'G40.9', 'Epilepsy, unspecified'],
    ['I00-I99', 'I10',   'Essential (primary) hypertension'],
    ['I00-I99', 'I21.9', 'Acute myocardial infarction, unspecified'],
    ['I00-I99', 'I63.9', 'Cerebral infarction, unspecified'],
    ['J00-J99', 'J06.9', 'Acute upper respiratory infection, unspecified'],
    ['J00-J99', 'J18.9', 'Pneumonia, unspecified organism'],
    ['J00-J99', 'J45.9', 'Asthma, unspecified'],
    ['J00-J99', 'J44.9', 'Chronic obstructive pulmonary disease, unspecified'],
    ['K00-K95', 'K29.7', 'Gastritis, unspecified'],
    ['K00-K95', 'K35.8', 'Acute appendicitis, unspecified'],
    ['K00-K95', 'K80.2', 'Calculus of gallbladder without cholecystitis'],
    ['O00-O9A', 'O80',   'Encounter for full-term uncomplicated delivery'],
    ['O00-O9A', 'O14.9', 'Pre-eclampsia, unspecified'],
    ['S00-T88', 'S72.0', 'Fracture of neck of femur'],
    ['S00-T88', 'T14.9', 'Injury, unspecified']
  ];
BEGIN
  FOR b IN SELECT id FROM branch LOOP
    FOR i IN 1 .. array_length(seed_groups, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM icd_group WHERE "branchId" = b.id AND name = seed_groups[i][1]
      ) THEN
        INSERT INTO icd_group (id, "branchId", name, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), b.id, seed_groups[i][1], NOW(), NOW());
      END IF;
    END LOOP;

    FOR i IN 1 .. array_length(seed_codes, 1) LOOP
      -- Groups are matched by their chapter range, which is carried in the
      -- seed arrays rather than stored, so the group name stays human.
      SELECT ig.id INTO gid
        FROM icd_group ig
       WHERE ig."branchId" = b.id
         AND ig.name = (
           SELECT seed_groups[j][1] FROM generate_subscripts(seed_groups, 1) j
            WHERE seed_groups[j][2] = seed_codes[i][1]
            LIMIT 1
         );

      IF gid IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM icd_code WHERE "branchId" = b.id AND code = seed_codes[i][2]
      ) THEN
        INSERT INTO icd_code (id, "branchId", "groupId", code, description, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), b.id, gid, seed_codes[i][2], seed_codes[i][3], NOW(), NOW());
      END IF;
    END LOOP;
  END LOOP;
END $$;
