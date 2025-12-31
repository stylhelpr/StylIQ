// src/db/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { createPoolConfig } from './pool';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 2000;

  async onModuleInit() {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `🔌 Connecting to PostgreSQL... (attempt ${attempt}/${this.maxRetries})`,
        );
        this.pool = new Pool(createPoolConfig());
        await this.pool.query('SELECT 1');
        console.log('✅ PostgreSQL connection established.');
        return;
      } catch (err) {
        lastError = err;
        console.warn(
          `⚠️ PostgreSQL connection attempt ${attempt} failed:`,
          err.message,
        );

        // Clean up failed pool before retry
        await this.pool?.end().catch(() => {});

        if (attempt < this.maxRetries) {
          console.log(`⏳ Retrying in ${this.retryDelayMs / 1000}s...`);
          await this.delay(this.retryDelayMs);
        }
      }
    }

    console.error('❌ Failed to connect to PostgreSQL after all retries');
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    await this.pool?.end();
    console.log('🔌 PostgreSQL connection closed.');
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    return this.pool.query(text, params);
  }

  getClient() {
    return this.pool;
  }
}

/////////////////////////

// src/db/database.service.ts
// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { Pool } from 'pg';

// @Injectable()
// export class DatabaseService implements OnModuleInit, OnModuleDestroy {
//   private pool: Pool;

//   async onModuleInit() {
//     try {
//       const databaseUrl = process.env.DATABASE_URL;

//       if (!databaseUrl) {
//         throw new Error('DATABASE_URL not defined in environment');
//       }

//       console.log('🔌 Connecting to PostgreSQL...');
//       this.pool = new Pool({
//         connectionString: databaseUrl,
//         ssl: {
//           rejectUnauthorized: false,
//         },
//       });
//       await this.pool.query('SELECT 1');
//       console.log('✅ PostgreSQL connection established.');
//     } catch (err) {
//       console.error('❌ Failed to connect to PostgreSQL:', err);
//       throw err;
//     }
//   }

//   async onModuleDestroy() {
//     await this.pool?.end();
//     console.log('🔌 PostgreSQL connection closed.');
//   }

//   async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
//     return this.pool.query(text, params);
//   }

//   getClient() {
//     return this.pool;
//   }
// }
