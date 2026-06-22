import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RegisterFcmTokenDto, DeregisterFcmTokenDto } from './dto/fcm-token.dto';

@Controller('users/me/fcm-token')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterFcmTokenDto) {
    return this.notifications.registerToken(user.id, dto.fcmToken, dto.platform);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deregister(@CurrentUser() user: AuthUser, @Body() dto: DeregisterFcmTokenDto) {
    await this.notifications.deregisterToken(user.id, dto.fcmToken);
  }
}