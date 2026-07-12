import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PairStatus } from '@tog/shared';

export class CreateProgramDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) total_days?: number;
}

export class CreatePairDto {
  @IsUUID() program_id!: string;
  @IsUUID() mentor_id!: string;
  @IsUUID() trainee_id!: string;
  @IsOptional() @IsUUID() parent_pair_id?: string;
  @IsOptional() @IsISO8601() start_date?: string;
}

export class UpdatePairDto {
  @IsOptional() @IsEnum(PairStatus) status?: PairStatus;
  @IsOptional() @IsISO8601() start_date?: string;
}

export class ProgressDto {
  @IsInt() @Min(1) day_number!: number;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsISO8601() entry_date?: string;
}
