-- La modalidad del profesional pasa de una lista (presencial y/o virtual) a un solo valor,
-- y se agrega "mixta" (atiende de las dos formas).
-- Se crea un enum nuevo en vez de ALTER TYPE ... ADD VALUE, porque un valor agregado con
-- ADD VALUE no se puede usar dentro de la misma transacción (y el UPDATE de abajo lo usa).

CREATE TYPE "Modalidad_new" AS ENUM ('presencial', 'virtual', 'mixta');

ALTER TABLE "profesionales" ADD COLUMN "modalidad" "Modalidad_new";

-- Conversión de los datos actuales:
--   [presencial, virtual] -> mixta
--   [presencial]          -> presencial
--   [virtual]             -> virtual
--   []                    -> NULL (sin definir)
UPDATE "profesionales"
SET "modalidad" = CASE
  WHEN 'presencial' = ANY ("modalidades") AND 'virtual' = ANY ("modalidades") THEN 'mixta'::"Modalidad_new"
  WHEN 'presencial' = ANY ("modalidades") THEN 'presencial'::"Modalidad_new"
  WHEN 'virtual' = ANY ("modalidades") THEN 'virtual'::"Modalidad_new"
  ELSE NULL
END;

ALTER TABLE "profesionales" DROP COLUMN "modalidades";

DROP TYPE "Modalidad";
ALTER TYPE "Modalidad_new" RENAME TO "Modalidad";
