import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateUserSubscriptionDto } from './dto/create-user-subscriptions.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscriptions.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class UserSubscriptionsService {
  async create(dto: CreateUserSubscriptionDto) {
    const {
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      plan,
      status,
      trial_ends_at,
      current_period_start,
      current_period_end,
    } = dto;

    const query = `
      INSERT INTO user_subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, plan, status,
        trial_ends_at, current_period_start, current_period_end
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`;

    const res = await pool.query(query, [
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      plan,
      status,
      trial_ends_at,
      current_period_start,
      current_period_end,
    ]);

    return res.rows[0];
  }

  async findByUserId(user_id: string) {
    const res = await pool.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1`,
      [user_id],
    );
    return res.rows[0];
  }

  async update(user_id: string, dto: UpdateUserSubscriptionDto) {
    const fields = Object.entries(dto).map(([key], i) => `${key} = $${i + 2}`);
    const values = Object.values(dto);

    const query = `
      UPDATE user_subscriptions SET ${fields.join(', ')}, updated_at = now()
      WHERE user_id = $1 RETURNING *`;

    const res = await pool.query(query, [user_id, ...values]);
    return res.rows[0];
  }

  async delete(user_id: string) {
    const res = await pool.query(
      `DELETE FROM user_subscriptions WHERE user_id = $1 RETURNING *`,
      [user_id],
    );
    return res.rows[0];
  }
}
