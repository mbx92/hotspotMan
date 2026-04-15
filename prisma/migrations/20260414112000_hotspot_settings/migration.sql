-- CreateEnum
CREATE TYPE "HotspotMode" AS ENUM ('CLICK_THROUGH', 'LOCAL_CREDENTIALS', 'RADIUS');

-- CreateTable
CREATE TABLE "HotspotSettings" (
    "id" UUID NOT NULL,
    "settingsKey" VARCHAR(32) NOT NULL DEFAULT 'default',
    "mode" "HotspotMode" NOT NULL DEFAULT 'CLICK_THROUGH',
    "gatewayName" VARCHAR(120) NOT NULL DEFAULT 'Hospital Wi-Fi',
    "landingPageUrl" VARCHAR(255),
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "radiusServer" VARCHAR(255),
    "radiusAuthPort" INTEGER NOT NULL DEFAULT 1812,
    "radiusAcctPort" INTEGER NOT NULL DEFAULT 1813,
    "radiusSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotspotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotspotSettings_settingsKey_key" ON "HotspotSettings"("settingsKey");