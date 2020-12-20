-- CreateTable
CREATE TABLE "User" (
"id" SERIAL,
    "email" TEXT NOT NULL,
    "passhash" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
"id" SERIAL,
    "name" TEXT NOT NULL,
    "canAccessVideoStream" BOOLEAN NOT NULL DEFAULT false,
    "canAccessControlPanel" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD FOREIGN KEY("roleId")REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
