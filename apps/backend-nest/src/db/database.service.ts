// db/database.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private pool: Pool;

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Google Cloud SQL SSL
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    return this.pool.query(text, params);
  }
}
