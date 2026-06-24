import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string = request.headers['authorization'] ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);

    const {
      data: { user },
      error,
    } = await this.supabase.authClient.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException();
    }

    request.user = {
      id: user.id,
      email: user.email ?? '',
      displayName: (user.user_metadata?.display_name as string) ?? undefined,
    };

    return true;
  }
}
