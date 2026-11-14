-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('transferencia', 'efectivo', 'mercado_pago', 'tarjeta', 'otro');

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "turno_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "referencia" TEXT,
    "fecha_pago" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagos_turno_id_key" ON "pagos"("turno_id");

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
