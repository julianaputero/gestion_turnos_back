-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('presencial', 'virtual');

-- CreateEnum
CREATE TYPE "TonoComunicacion" AS ENUM ('cercano', 'formal', 'neutro');

-- CreateTable
CREATE TABLE "profesionales" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "especialidad" TEXT,
    "matricula" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "honorario_base" DECIMAL(12,2),
    "telefono" TEXT,
    "modalidades" "Modalidad"[] DEFAULT ARRAY[]::"Modalidad"[],
    "dias_atencion" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recordatorio_horas_antes" INTEGER NOT NULL DEFAULT 24,
    "tono_comunicacion" "TonoComunicacion" NOT NULL DEFAULT 'neutro',
    "link_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profesionales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profesionales_user_id_key" ON "profesionales"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profesionales_link_token_key" ON "profesionales"("link_token");

-- AddForeignKey
ALTER TABLE "profesionales" ADD CONSTRAINT "profesionales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: una ficha vacía (valores por defecto) para cada profesional que ya existe.
INSERT INTO "profesionales" ("id", "user_id", "link_token", "updated_at")
SELECT gen_random_uuid()::text, u."id", replace(gen_random_uuid()::text, '-', ''), CURRENT_TIMESTAMP
FROM "users" u
WHERE u."role" = 'profesional';
