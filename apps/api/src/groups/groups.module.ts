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
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';

class GroupDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() leader_id?: string;
}

@Injectable()
class GroupsService {
  constructor(private readonly supabase: SupabaseService) {}

  findAll() {
    return this.supabase.db
      .from('groups')
      .select('*, leader:members!groups_leader_id_fkey(id,full_name,role)')
      .order('name')
      .then(unwrap);
  }

  async findOne(id: string) {
    const group = unwrap(
      await this.supabase.db
        .from('groups')
        .select('*, leader:members!groups_leader_id_fkey(id,full_name,role)')
        .eq('id', id)
        .single(),
    );
    const members = unwrap(
      await this.supabase.db
        .from('members')
        .select('id,full_name,role,status')
        .eq('group_id', id)
        .order('full_name'),
    );
    return { ...(group as object), members };
  }

  create(dto: GroupDto) {
    return this.supabase.db
      .from('groups')
      .insert(dto)
      .select()
      .single()
      .then(unwrap);
  }

  update(id: string, dto: GroupDto) {
    return this.supabase.db
      .from('groups')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap);
  }

  async remove(id: string) {
    unwrap(
      await this.supabase.db
        .from('groups')
        .delete()
        .eq('id', id)
        .select()
        .single(),
    );
    return { id };
  }
}

@Controller('groups')
class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get() findAll() {
    return this.groups.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.groups.findOne(id);
  }
  @Post() create(@Body() dto: GroupDto) {
    return this.groups.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: GroupDto) {
    return this.groups.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.groups.remove(id);
  }
}

@Module({
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
