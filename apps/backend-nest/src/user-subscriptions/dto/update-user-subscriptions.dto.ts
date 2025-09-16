export class UpdateUserSubscriptionDto {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan?: string;
  status?: string;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
}
