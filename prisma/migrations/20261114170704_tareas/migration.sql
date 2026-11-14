-- CreateEnum
CREATE TYPE "TipoTarea" AS ENUM ('recordatorio_turno', 'cobro_pendiente');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'completada', 'vencida');

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoTarea" NOT NULL,
    "turno_id" TEXT NOT NULL,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "completada_at" TIMESTAMP(3),
    "completada_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tareas_estado_idx" ON "tareas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "tareas_tipo_turno_id_key" ON "tareas"("tipo", "turno_id");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_completada_por_id_fkey" FOREIGN KEY ("completada_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
