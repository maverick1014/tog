import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ChurchRole, Gender, GroupPosition, MemberStatus } from '@tog/shared';

export class CreateMemberDto {
  @IsString()
  @MaxLength(200)
  full_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  chinese_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsISO8601()
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(ChurchRole)
  church_role?: ChurchRole;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsUUID()
  group_id?: string;

  @IsOptional()
  @IsEnum(GroupPosition)
  group_position?: GroupPosition;

  @IsOptional()
  @IsUUID()
  household_id?: string;

  @IsOptional()
  @IsISO8601()
  joined_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {}
