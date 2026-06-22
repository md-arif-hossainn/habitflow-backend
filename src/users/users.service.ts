import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.db.auth.admin.getUserById(userId);

    if (error || !data.user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    const u = data.user;
    return {
      id: u.id,
      email: u.email,
      displayName: u.user_metadata?.display_name ?? null,
      createdAt: u.created_at,
    };
  }

  async updateProfile(userId: string, displayName: string) {
    const { data, error } = await this.supabase.db.auth.admin.updateUserById(userId, {
      user_metadata: { display_name: displayName },
    });

    if (error) throw new Error(error.message);

    return {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.display_name ?? null,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Verify current password by attempting a sign-in.
    const { data: userData } = await this.supabase.db.auth.admin.getUserById(userId);
    if (!userData?.user?.email) throw new NotFoundException();

    const { error: signInError } = await this.supabase.authClient.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new UnauthorizedException({
        code: 'WRONG_PASSWORD',
        message: 'Current password is incorrect.',
      });
    }

    if (currentPassword === newPassword) {
      throw new UnprocessableEntityException({
        code: 'SAME_PASSWORD',
        message: 'New password must be different from your current password.',
      });
    }

    const { error } = await this.supabase.db.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw new Error(error.message);
  }

  async deleteAccount(userId: string, password: string) {
    const { data: userData } = await this.supabase.db.auth.admin.getUserById(userId);
    if (!userData?.user?.email) throw new NotFoundException();

    // Verify password before deletion.
    const { error: signInError } = await this.supabase.authClient.auth.signInWithPassword({
      email: userData.user.email,
      password,
    });

    if (signInError) {
      throw new UnauthorizedException({
        code: 'WRONG_PASSWORD',
        message: 'Password confirmation failed.',
      });
    }

    // Deleting the auth user cascades to habits and completions via DB foreign keys.
    const { error } = await this.supabase.db.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  }
}