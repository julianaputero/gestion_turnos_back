-- Las plantillas pasan a ser por profesional (en vez de por tono) y se quita el tono.
-- Las plantillas guardadas por tono no se pueden asignar a un profesional: se descartan
-- (al crear esta migración no había ninguna). Cada profesional vuelve a la de por defecto.
DELETE FROM "plantillas_mensajes";

-- DropIndex
DROP INDEX "plantillas_mensajes_tipo_tono_key";

-- AlterTable
ALTER TABLE "profesionales" DROP COLUMN "tono_comunicacion";

-- AlterTable
ALTER TABLE "plantillas_mensajes" DROP COLUMN "tono",
ADD COLUMN     "profesional_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TonoComunicacion";

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_mensajes_profesional_id_tipo_key" ON "plantillas_mensajes"("profesional_id", "tipo");

-- AddForeignKey
ALTER TABLE "plantillas_mensajes" ADD CONSTRAINT "plantillas_mensajes_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

