import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export enum HabitCategory {
  Health = 'health',
  Fitness = 'fitness',
  Study = 'study',
  Personal = 'personal',
}

export enum HabitFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
}

export class CreateHabitDto {
  @IsString()
  @MaxLength(40)
  name: string;

  @IsString()
  @MaxLength(10)
  emoji: string;

  @IsInt()
  colorValue: number;

  @IsEnum(HabitCategory)
  category: HabitCategory;

  @IsEnum(HabitFrequency)
  frequency: HabitFrequency;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'reminderTime must be in HH:mm format' })
  reminderTime?: string;
}