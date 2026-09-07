import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client"

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

const adapter = new PrismaPg(pool);

export const client = new PrismaClient({ adapter });