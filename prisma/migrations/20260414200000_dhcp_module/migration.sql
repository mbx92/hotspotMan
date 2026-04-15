-- CreateEnum
CREATE TYPE "DhcpProvider" AS ENUM ('DNSMASQ', 'KEA');

-- CreateTable
CREATE TABLE "DhcpSettings" (
    "id" UUID NOT NULL,
    "settingsKey" VARCHAR(32) NOT NULL DEFAULT 'default',
    "provider" "DhcpProvider" NOT NULL DEFAULT 'DNSMASQ',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "interfaceName" VARCHAR(64) NOT NULL DEFAULT 'br-lan',
    "listenAddress" VARCHAR(64),
    "subnet" VARCHAR(64) NOT NULL DEFAULT '192.168.30.0/24',
    "rangeStart" VARCHAR(64) NOT NULL DEFAULT '192.168.30.50',
    "rangeEnd" VARCHAR(64) NOT NULL DEFAULT '192.168.30.200',
    "routerIp" VARCHAR(64) NOT NULL DEFAULT '192.168.30.1',
    "dnsServers" VARCHAR(255) NOT NULL DEFAULT '1.1.1.1,8.8.8.8',
    "domainName" VARCHAR(120),
    "leaseTime" VARCHAR(32) NOT NULL DEFAULT '12h',
    "dnsmasqConfigPath" VARCHAR(255),
    "keaConfigPath" VARCHAR(255),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DhcpSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DhcpReservation" (
    "id" UUID NOT NULL,
    "dhcpSettingsId" UUID NOT NULL,
    "mac" VARCHAR(17) NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "hostname" VARCHAR(120),
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DhcpReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DhcpSettings_settingsKey_key" ON "DhcpSettings"("settingsKey");

-- CreateIndex
CREATE INDEX "DhcpReservation_dhcpSettingsId_idx" ON "DhcpReservation"("dhcpSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "DhcpReservation_dhcpSettingsId_mac_key" ON "DhcpReservation"("dhcpSettingsId", "mac");

-- CreateIndex
CREATE UNIQUE INDEX "DhcpReservation_dhcpSettingsId_ip_key" ON "DhcpReservation"("dhcpSettingsId", "ip");

-- AddForeignKey
ALTER TABLE "DhcpReservation" ADD CONSTRAINT "DhcpReservation_dhcpSettingsId_fkey" FOREIGN KEY ("dhcpSettingsId") REFERENCES "DhcpSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;