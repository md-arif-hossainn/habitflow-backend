import * as crypto from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  user_metadata?: { display_name?: string };
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');

    // Cache the PEM-encoded public key after the first JWKS fetch.
    // Supabase issues ES256 (ECDSA P-256) tokens; secretOrKey only works
    // for HS256 so we use secretOrKeyProvider to supply the EC public key.
    let cachedPem: string | null = null;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['ES256'],
      secretOrKeyProvider: async (
        _req: unknown,
        _rawJwt: unknown,
        done: (err: Error | null, key?: string) => void,
      ) => {
        try {
          if (!cachedPem) {
            const res = await fetch(
              `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            );
            if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
            const { keys } = (await res.json()) as { keys: JsonWebKey[] };
            if (!keys?.length) throw new Error('Empty JWKS');
            const pubKey = crypto.createPublicKey({
              key: keys[0] as crypto.JsonWebKeyInput['key'],
              format: 'jwk',
            } as crypto.JsonWebKeyInput);
            cachedPem = pubKey.export({ type: 'spki', format: 'pem' }) as string;
          }
          done(null, cachedPem);
        } catch (e) {
          done(e as Error);
        }
      },
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return {
      id: payload.sub,
      email: payload.email,
      displayName: payload.user_metadata?.display_name,
    };
  }
}
