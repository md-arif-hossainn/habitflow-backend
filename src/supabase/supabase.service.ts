import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient;
  private readonly anonClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = config.getOrThrow<string>('SUPABASE_URL');

    // Service-role client — bypasses RLS for all DB queries.
    // Authorization is enforced explicitly in each service (user_id checks).
    this.adminClient = createClient(
      url,
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Anon client — used only for Supabase Auth operations
    // (signUp, signInWithPassword, refreshSession, resetPasswordForEmail).
    this.anonClient = createClient(
      url,
      config.getOrThrow<string>('SUPABASE_ANON_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  /** Service-role client: DB queries + admin auth operations. */
  get db(): SupabaseClient {
    return this.adminClient;
  }

  /** Anon client: user-facing auth operations. */
  get authClient(): SupabaseClient {
    return this.anonClient;
  }
}
