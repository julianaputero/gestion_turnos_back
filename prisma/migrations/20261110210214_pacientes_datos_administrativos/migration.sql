-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "cobertura" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "notas_administrativas" TEXT,
ADD COLUMN     "profesional_asignado_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_dni_key" ON "pacientes"("dni");

-- CreateIndex
CREATE INDEX "pacientes_profesional_asignado_id_idx" ON "pacientes"("profesional_asignado_id");

-- CreateIndex
CREATE INDEX "pacientes_apellido_nombre_idx" ON "pacientes"("apellido", "nombre");

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_profesional_asignado_id_fkey" FOREIGN KEY ("profesional_asignado_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

