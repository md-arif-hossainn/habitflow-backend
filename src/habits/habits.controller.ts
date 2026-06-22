import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { HabitsService } from './habits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { AddCompletionDto } from './dto/add-completion.dto';

@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private habits: HabitsService) {}

  // ── Habit CRUD ──────────────────────────────────────────────────────────────

  @Get()
  getAll(@CurrentUser() user: AuthUser) {
    return this.habits.getAll(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.habits.getOne(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHabitDto) {
    return this.habits.create(user.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habits.update(user.id, id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@CurrentUser() user: AuthUser) {
    await this.habits.deleteAll(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.habits.delete(user.id, id);
  }

  // ── Completions ─────────────────────────────────────────────────────────────

  @Post(':id/completions')
  @HttpCode(HttpStatus.CREATED)
  addCompletion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddCompletionDto,
  ) {
    return this.habits.addCompletion(user.id, id, dto);
  }

  @Delete(':id/completions/:date')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCompletion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('date') date: string,
  ) {
    await this.habits.removeCompletion(user.id, id, date);
  }
}