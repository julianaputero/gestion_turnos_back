-- CreateEnum
CREATE TYPE "TipoMensaje" AS ENUM ('recordatorio_turno', 'cobro_pendiente', 'confirmacion_reserva');

-- CreateTable
CREATE TABLE "plantillas_mensajes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMensaje" NOT NULL,
    "tono" "TonoComunicacion" NOT NULL,
    "contenido" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "tipo" "TipoMensaje" NOT NULL,
    "contenido" TEXT NOT NULL,
    "enviado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_mensajes_tipo_tono_key" ON "plantillas_mensajes"("tipo", "tono");

-- CreateIndex
CREATE INDEX "mensajes_paciente_id_enviado_at_idx" ON "mensajes"("paciente_id", "enviado_at");

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
