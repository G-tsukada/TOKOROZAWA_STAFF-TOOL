import { config } from "dotenv"
// Next.js の .env.local を Prisma CLI でも読み込む
config({ path: ".env.local" })
config({ path: ".env" }) // フォールバック

import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
