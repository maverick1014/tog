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
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';

class HouseholdDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
class HouseholdsService {
  constructor(private readonly supabase: SupabaseService) {}

  findAll() {
    return this.supabase.db
      .from('households')
      .select('*')
      .order('name')
      .then(unwrap);
  }

  async findOne(id: string) {
    const household = unwrap(
      await this.supabase.db.from('households').select('*').eq('id', id).single(),
    );
    const members = unwrap(
      await this.supabase.db
        .from('members')
        .select('id,full_name,role')
        .eq('household_id', id),
    );
    return { ...(household as object), members };
  }

  create(dto: HouseholdDto) {
    return this.supabase.db
      .from('households')
      .insert(dto)
      .select()
      .single()
      .then(unwrap);
  }

  update(id: string, dto: HouseholdDto) {
    return this.supabase.db
      .from('households')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap);
  }

  async remove(id: string) {
    unwrap(
      await this.supabase.db
        .from('households')
        .delete()
        .eq('id', id)
        .select()
        .single(),
    );
    return { id };
  }
}

@Controller('households')
class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Get() findAll() {
    return this.households.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.households.findOne(id);
  }
  @Post() create(@Body() dto: HouseholdDto) {
    return this.households.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: HouseholdDto) {
    return this.households.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.households.remove(id);
  }
}

@Module({
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
})
export class HouseholdsModule {}
