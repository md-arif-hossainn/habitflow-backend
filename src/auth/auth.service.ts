import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  async register(email: string, password: string, displayName: string) {
    const { data, error } = await this.supabase.authClient.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'This email address is already registered.',
        });
      }
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: error.message });
    }

    if (!data.session) {
      throw new BadRequestException({
        code: 'EMAIL_CONFIRMATION_REQUIRED',
        message: 'Account created. Please verify your email before signing in.',
      });
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.display_name ?? null,
        createdAt: data.user.created_at,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.display_name ?? null,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.supabase.authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      const expired = error.message.toLowerCase().includes('expired');
      throw new UnauthorizedException({
        code: expired ? 'REFRESH_TOKEN_EXPIRED' : 'REFRESH_TOKEN_INVALID',
        message: expired
          ? 'Your session has expired. Please sign in again.'
          : 'Invalid refresh token.',
      });
    }

    return {
      accessToken: data.session.access_token,
      expiresIn: data.session.expires_in,
    };
  }

  async logout(userId: string) {
    // Best-effort server-side session revocation.
    // The client must always clear its own stored tokens regardless of outcome.
    try {
      await this.supabase.db.auth.admin.deleteUser(userId);
    } catch {
      // Non-critical — JWT is stateless and expires on its own.
    }
  }

  async forgotPassword(email: string) {
    const redirectTo =
      this.config.get<string>('APP_DEEP_LINK') ?? 'habitflow://reset-password';
    await this.supabase.authClient.auth.resetPasswordForEmail(email, { redirectTo });
    // Always return the same message regardless of whether the email exists
    // to prevent user enumeration.
  }

  async resetPassword(token: string, newPassword: string) {
    // The token is the access_token from the deep-link: habitflow://reset-password#access_token=...
    const secret = this.config.getOrThrow<string>('SUPABASE_JWT_SECRET');
    let userId: string;

    try {
      const decoded = jwt.verify(token, secret) as { sub: string };
      userId = decoded.sub;
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        throw new GoneException({
          code: 'RESET_TOKEN_EXPIRED',
          message: 'The reset link has expired. Please request a new one.',
        });
      }
      throw new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        message: 'Invalid or already-used reset token.',
      });
    }

    const { error } = await this.supabase.db.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new BadRequestException({ code: 'RESET_FAILED', message: error.message });
    }
  }
}
