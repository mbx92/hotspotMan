-- AlterTable
ALTER TABLE "HotspotSettings"
ADD COLUMN     "radiusClientIp" VARCHAR(64),
ADD COLUMN     "radiusNasIdentifier" VARCHAR(120);

-- AlterTable
ALTER TABLE "Session"
ADD COLUMN     "authMode" "HotspotMode" NOT NULL DEFAULT 'CLICK_THROUGH',
ADD COLUMN     "hotspotUserId" UUID,
ADD COLUMN     "hotspotUsername" VARCHAR(64);

-- CreateTable
CREATE TABLE "HotspotUser" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotspotUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotspotUser_username_key" ON "HotspotUser"("username");

-- CreateIndex
CREATE INDEX "Session_hotspotUserId_idx" ON "Session"("hotspotUserId");

-- CreateIndex
CREATE INDEX "Session_hotspotUsername_idx" ON "Session"("hotspotUsername");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_hotspotUserId_fkey" FOREIGN KEY ("hotspotUserId") REFERENCES "HotspotUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;