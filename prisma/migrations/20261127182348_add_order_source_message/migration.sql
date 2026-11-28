/*
  Warnings:

  - A unique constraint covering the columns `[source_message_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `source_message_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "source_message_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_source_message_id_key" ON "orders"("source_message_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
