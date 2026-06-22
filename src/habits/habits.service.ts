import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { AddCompletionDto } from './dto/add-completion.dto';

@Injectable()
export class HabitsService {
  constructor(private supabase: SupabaseService) {}

  // ── Habit CRUD ──────────────────────────────────────────────────────────────

  async getAll(userId: string) {
    const { data, error } = await this.supabase.db
      .from('habits')
      .select('*, habit_completions(completed_date)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return { habits: data.map(this.toResponse) };
  }

  async getOne(userId: string, id: string) {
    const { data, error } = await this.supabase.db
      .from('habits')
      .select('*, habit_completions(completed_date)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException({ code: 'HABIT_NOT_FOUND', message: 'Habit not found.' });
    }

    return { habit: this.toResponse(data) };
  }

  async create(userId: string, dto: CreateHabitDto) {
    const { data, error } = await this.supabase.db
      .from('habits')
      .insert({
        user_id: userId,
        name: dto.name,
        emoji: dto.emoji,
        color_value: dto.colorValue,
        category: dto.category,
        frequency: dto.frequency,
        reminder_time: dto.reminderTime ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { habit: this.toResponse({ ...data, habit_completions: [] }) };
  }

  async update(userId: string, id: string, dto: UpdateHabitDto) {
    await this.assertOwnership(userId, id);

    const patch: Record<string, any> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.emoji !== undefined) patch.emoji = dto.emoji;
    if (dto.colorValue !== undefined) patch.color_value = dto.colorValue;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.frequency !== undefined) patch.frequency = dto.frequency;
    if (dto.reminderTime !== undefined) patch.reminder_time = dto.reminderTime;

    const { data, error } = await this.supabase.db
      .from('habits')
      .update(patch)
      .eq('id', id)
      .select('*, habit_completions(completed_date)')
      .single();

    if (error) throw new Error(error.message);

    return { habit: this.toResponse(data) };
  }

  async delete(userId: string, id: string) {
    await this.assertOwnership(userId, id);

    const { error } = await this.supabase.db
      .from('habits')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async deleteAll(userId: string) {
    const { error } = await this.supabase.db
      .from('habits')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  // ── Completions ─────────────────────────────────────────────────────────────

  async addCompletion(userId: string, habitId: string, dto: AddCompletionDto) {
    await this.assertOwnership(userId, habitId);

    const today = new Date().toISOString().split('T')[0];
    if (dto.date > today) {
      throw new UnprocessableEntityException({
        code: 'FUTURE_DATE',
        message: 'Cannot mark a future date as completed.',
      });
    }

    const { data: habit } = await this.supabase.db
      .from('habits')
      .select('frequency')
      .eq('id', habitId)
      .single();

    // Weekly habits: only one completion per calendar week allowed.
    if (habit?.frequency === 'weekly') {
      const { weekStart, weekEnd } = getWeekBounds(dto.date);
      const { data: existing } = await this.supabase.db
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .gte('completed_date', weekStart)
        .lte('completed_date', weekEnd)
        .maybeSingle();

      if (existing) {
        throw new ConflictException({
          code: 'WEEK_ALREADY_COMPLETED',
          message: 'This weekly habit is already marked for this week.',
        });
      }
    }

    const { error } = await this.supabase.db
      .from('habit_completions')
      .insert({ habit_id: habitId, user_id: userId, completed_date: dto.date });

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException({
          code: 'ALREADY_COMPLETED',
          message: 'This habit is already marked as completed for that date.',
        });
      }
      throw new Error(error.message);
    }

    return { habitId, date: dto.date };
  }

  async removeCompletion(userId: string, habitId: string, date: string) {
    await this.assertOwnership(userId, habitId);

    const { error } = await this.supabase.db
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('completed_date', date);

    if (error) throw new Error(error.message);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async assertOwnership(userId: string, habitId: string) {
    const { data, error } = await this.supabase.db
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException({ code: 'HABIT_NOT_FOUND', message: 'Habit not found.' });
    }
  }

  private toResponse(habit: any) {
    return {
      id: habit.id,
      userId: habit.user_id,
      name: habit.name,
      emoji: habit.emoji,
      colorValue: habit.color_value,
      category: habit.category,
      frequency: habit.frequency,
      reminderTime: habit.reminder_time ?? null,
      createdAt: habit.created_at,
      completedDates: (habit.habit_completions ?? []).map(
        (c: any) => c.completed_date,
      ),
    };
  }
}

function getWeekBounds(dateStr: string): { weekStart: string; weekEnd: string } {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0=Sun, 1=Mon, …
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}
