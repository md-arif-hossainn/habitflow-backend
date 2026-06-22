import { IsString, IsEnum } from 'class-validator';

export enum Platform {
  Android = 'android',
  iOS = 'ios',
}

export class RegisterFcmTokenDto {
  @IsString()
  fcmToken: string;

  @IsEnum(Platform)
  platform: Platform;
}

export class DeregisterFcmTokenDto {
  @IsString()
  fcmToken: string;
}