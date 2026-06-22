import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { HabitCategory, HabitFrequency } from './create-habit.dto';

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @IsOptional()
  @IsInt()
  colorValue?: number;

  @IsOptional()
  @IsEnum(HabitCategory)
  category?: HabitCategory;

  @IsOptional()
  @IsEnum(HabitFrequency)
  frequency?: HabitFrequency;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'reminderTime must be in HH:mm format' })
  reminderTime?: string;
}
