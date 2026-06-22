import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Platform } from './dto/fcm-token.dto';

@Injectable()
export class NotificationsService {
  constructor(private supabase: SupabaseService) {}

  async registerToken(userId: string, fcmToken: string, platform: Platform) {
    // Upsert: update the platform if the token already exists for this user.
    const { error } = await this.supabase.db
      .from('fcm_tokens')
      .upsert(
        { user_id: userId, token: fcmToken, platform },
        { onConflict: 'user_id, token' },
      );

    if (error) throw new Error(error.message);

    return { message: 'FCM token registered.' };
  }

  async deregisterToken(userId: string, fcmToken: string) {
    const { error } = await this.supabase.db
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', fcmToken);

    if (error) throw new Error(error.message);
  }
}