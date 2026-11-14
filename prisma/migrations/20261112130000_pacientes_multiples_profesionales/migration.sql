-- DropForeignKey
ALTER TABLE "pacientes" DROP CONSTRAINT "pacientes_profesional_asignado_id_fkey";

-- DropForeignKey
ALTER TABLE "turnos" DROP CONSTRAINT "turnos_paciente_id_fkey";

-- DropIndex
DROP INDEX "pacientes_profesional_asignado_id_idx";

-- AlterTable
ALTER TABLE "pacientes" DROP COLUMN "profesional_asignado_id";

-- CreateTable
CREATE TABLE "paciente_profesionales" (
    "paciente_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paciente_profesionales_pkey" PRIMARY KEY ("paciente_id","profesional_id")
);

-- CreateIndex
CREATE INDEX "paciente_profesionales_profesional_id_idx" ON "paciente_profesionales"("profesional_id");

-- AddForeignKey
ALTER TABLE "paciente_profesionales" ADD CONSTRAINT "paciente_profesionales_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_profesionales" ADD CONSTRAINT "paciente_profesionales_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regla: un paciente siempre tiene al menos un profesional asignado.
-- Cuando se borra una asignación (por ejemplo, porque se borró el profesional y la
-- asignación cae en cascada) y el paciente se queda sin ningún profesional, se borra
-- el paciente (y sus turnos, por el ON DELETE CASCADE de turnos.paciente_id).
-- Si el paciente sigue asignado a otro profesional, no se toca.
CREATE FUNCTION "borrar_paciente_sin_profesionales"() RETURNS trigger AS $$
BEGIN
  DELETE FROM "pacientes" p
  WHERE p."id" = OLD."paciente_id"
    AND NOT EXISTS (
      SELECT 1 FROM "paciente_profesionales" pp WHERE pp."paciente_id" = OLD."paciente_id"
    );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "paciente_profesionales_borrar_huerfanos"
AFTER DELETE ON "paciente_profesionales"
FOR EACH ROW EXECUTE FUNCTION "borrar_paciente_sin_profesionales"();
