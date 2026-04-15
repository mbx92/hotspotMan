-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "mac" VARCHAR(17) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_loginAt_idx" ON "Session"("loginAt");

-- CreateIndex
CREATE INDEX "Session_logoutAt_idx" ON "Session"("logoutAt");

-- CreateIndex
CREATE INDEX "Session_mac_idx" ON "Session"("mac");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "Banner_isActive_createdAt_idx" ON "Banner"("isActive", "createdAt");