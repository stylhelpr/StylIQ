// db/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    return this.pool.query(text, params);
  }
}

////////////

// // db/database.service.ts
// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { Pool } from 'pg';

// @Injectable()
// export class DatabaseService implements OnModuleInit {
//   private pool: Pool;

//   async onModuleInit() {
//     this.pool = new Pool({
//       connectionString: process.env.DATABASE_URL,
//       ssl: { rejectUnauthorized: false },
//     });
//   }

//   async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
//     return this.pool.query(text, params);
//   }
// }
