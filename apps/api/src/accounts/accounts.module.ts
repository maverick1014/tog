import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { AccountRole, AccountStatus } from '@tog/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';

const SELECT =
  '*, member:members(id,full_name,church_role,group_position)';

class CreateAccountDto {
  @IsUUID() member_id!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsEnum(AccountRole) account_role?: AccountRole;
  @IsOptional() @IsEnum(AccountStatus) status?: AccountStatus;
  @IsOptional() @IsString() password_hash?: string;
  @IsOptional() @IsBoolean() two_factor?: boolean;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsBoolean() notify_discipleship?: boolean;
  @IsOptional() @IsBoolean() notify_donation?: boolean;
  @IsOptional() @IsBoolean() notify_weekly?: boolean;
}

class UpdateAccountDto extends PartialType(CreateAccountDto) {}

@Injectable()
class AccountsService {
  constructor(private readonly supabase: SupabaseService) {}

  findAll() {
    return this.supabase.db
      .from('app_users')
      .select(SELECT)
      .order('created_at', { ascending: true })
      .then(unwrap);
  }

  findOne(id: string) {
    return this.supabase.db
      .from('app_users')
      .select(SELECT)
      .eq('id', id)
      .single()
      .then(unwrap);
  }

  create(dto: CreateAccountDto) {
    return this.supabase.db
      .from('app_users')
      .insert(dto)
      .select(SELECT)
      .single()
      .then(unwrap);
  }

  update(id: string, dto: UpdateAccountDto) {
    return this.supabase.db
      .from('app_users')
      .update(dto)
      .eq('id', id)
      .select(SELECT)
      .single()
      .then(unwrap);
  }

  async remove(id: string) {
    unwrap(
      await this.supabase.db
        .from('app_users')
        .delete()
        .eq('id', id)
        .select()
        .single(),
    );
    return { id };
  }
}

@Controller('accounts')
class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get() findAll() {
    return this.accounts.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.accounts.findOne(id);
  }
  @Post() create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.accounts.remove(id);
  }
}

@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
