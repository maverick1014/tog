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
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, EventType } from '@tog/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';

class EventDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(EventType) event_type?: EventType;
  @IsOptional() @IsString() location?: string;
  @IsISO8601() starts_at!: string;
  @IsOptional() @IsISO8601() ends_at?: string;
}

class AttendanceItemDto {
  @IsUUID() member_id!: string;
  @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @IsOptional() @IsString() notes?: string;
}

class RecordAttendanceDto {
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records!: AttendanceItemDto[];
}

@Injectable()
class EventsService {
  constructor(private readonly supabase: SupabaseService) {}

  findAll() {
    return this.supabase.db
      .from('events')
      .select('*')
      .order('starts_at', { ascending: false })
      .then(unwrap);
  }

  async findOne(id: string) {
    const event = unwrap<Record<string, unknown>>(
      await this.supabase.db.from('events').select('*').eq('id', id).single(),
    );
    const attendance = unwrap(
      await this.supabase.db
        .from('event_attendance')
        .select('*, member:members(id,full_name,church_role,group_position)')
        .eq('event_id', id),
    );
    return { ...event, attendance };
  }

  create(dto: EventDto) {
    return this.supabase.db
      .from('events')
      .insert(dto)
      .select()
      .single()
      .then(unwrap);
  }

  update(id: string, dto: EventDto) {
    return this.supabase.db
      .from('events')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap);
  }

  async remove(id: string) {
    unwrap(
      await this.supabase.db.from('events').delete().eq('id', id).select().single(),
    );
    return { id };
  }

  /** Upsert attendance rows for an event (idempotent on event_id+member_id). */
  recordAttendance(eventId: string, dto: RecordAttendanceDto) {
    const rows = dto.records.map((r) => ({
      event_id: eventId,
      member_id: r.member_id,
      status: r.status ?? AttendanceStatus.Present,
      notes: r.notes ?? null,
    }));
    return this.supabase.db
      .from('event_attendance')
      .upsert(rows, { onConflict: 'event_id,member_id' })
      .select()
      .then(unwrap);
  }
}

@Controller('events')
class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get() findAll() {
    return this.events.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.events.findOne(id);
  }
  @Post() create(@Body() dto: EventDto) {
    return this.events.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: EventDto) {
    return this.events.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.events.remove(id);
  }

  @Post(':id/attendance')
  recordAttendance(@Param('id') id: string, @Body() dto: RecordAttendanceDto) {
    return this.events.recordAttendance(id, dto);
  }
}

@Module({
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
