import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EnrollmentStatus } from '@tog/shared';

export class CreateTrainingDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsUUID() trainer_id?: string;
  @IsOptional() @IsInt() @Min(1) total_sessions?: number;
  @IsOptional() @IsBoolean() is_enrollable?: boolean;
  @IsOptional() @IsISO8601() starts_on?: string;
  @IsOptional() @IsISO8601() ends_on?: string;
}

export class SessionDto {
  @IsInt() @Min(1) session_number!: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsISO8601() scheduled_at?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() notes?: string;
}

export class EnrollDto {
  @IsUUID() member_id!: string;
  @IsOptional() @IsEnum(EnrollmentStatus) status?: EnrollmentStatus;
}

export class UpdateEnrollmentDto {
  @IsOptional() @IsEnum(EnrollmentStatus) status?: EnrollmentStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsString() notes?: string;
}

class AttendanceItemDto {
  @IsUUID() member_id!: string;
  @IsBoolean() attended!: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class SessionAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records!: AttendanceItemDto[];
}
