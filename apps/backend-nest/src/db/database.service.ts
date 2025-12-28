// src/db/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { createPoolConfig } from './pool';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  async onModuleInit() {
    try {
      console.log('🔌 Connecting to PostgreSQL...');
      this.pool = new Pool(createPoolConfig());
      await this.pool.query('SELECT 1');
      console.log('✅ PostgreSQL connection established.');
    } catch (err) {
      console.error('❌ Failed to connect to PostgreSQL:', err);
      throw err;
    }
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
