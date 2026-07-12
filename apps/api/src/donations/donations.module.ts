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
  Query,
} from '@nestjs/common';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DonationMethod } from '@tog/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';

class DonationDto {
  @IsOptional() @IsUUID() member_id?: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() fund?: string;
  @IsOptional() @IsEnum(DonationMethod) method?: DonationMethod;
  @IsOptional() @IsISO8601() donated_at?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
class DonationsService {
  constructor(private readonly supabase: SupabaseService) {}

  findAll(filters: { member_id?: string; fund?: string }) {
    let query = this.supabase.db
      .from('donations')
      .select('*, member:members(id,full_name)')
      .order('donated_at', { ascending: false });
    if (filters.member_id) query = query.eq('member_id', filters.member_id);
    if (filters.fund) query = query.eq('fund', filters.fund);
    return query.then(unwrap);
  }

  create(dto: DonationDto) {
    return this.supabase.db
      .from('donations')
      .insert(dto)
      .select()
      .single()
      .then(unwrap);
  }

  update(id: string, dto: DonationDto) {
    return this.supabase.db
      .from('donations')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap);
  }

  async remove(id: string) {
    unwrap(
      await this.supabase.db
        .from('donations')
        .delete()
        .eq('id', id)
        .select()
        .single(),
    );
    return { id };
  }

  /** Totals grouped by fund. */
  async summary() {
    const rows = unwrap(
      await this.supabase.db.from('donations').select('fund, amount'),
    ) as Array<{ fund: string; amount: number }>;
    const byFund: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const amt = Number(r.amount);
      byFund[r.fund] = (byFund[r.fund] ?? 0) + amt;
      total += amt;
    }
    return { total, byFund };
  }
}

@Controller('donations')
class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get() findAll(
    @Query('member_id') memberId?: string,
    @Query('fund') fund?: string,
  ) {
    return this.donations.findAll({ member_id: memberId, fund });
  }
  @Get('summary') summary() {
    return this.donations.summary();
  }
  @Post() create(@Body() dto: DonationDto) {
    return this.donations.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: DonationDto) {
    return this.donations.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.donations.remove(id);
  }
}

@Module({
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
