import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  // The access_token extracted from the password-reset deep-link URL fragment.
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}