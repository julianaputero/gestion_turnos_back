-- AlterTable
ALTER TABLE "mensajes" ADD COLUMN     "turno_id" TEXT;

-- CreateIndex
CREATE INDEX "mensajes_turno_id_idx" ON "mensajes"("turno_id");

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
