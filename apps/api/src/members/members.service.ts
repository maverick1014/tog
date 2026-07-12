import { Injectable } from '@nestjs/common';
import type { Member } from '@tog/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';
import { CreateMemberDto, UpdateMemberDto } from './dto';

const TABLE = 'members';

@Injectable()
export class MembersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(filters: { role?: string; group_id?: string; q?: string }) {
    let query = this.supabase.db
      .from(TABLE)
      .select('*, group:groups(id,name), household:households(id,name)')
      .order('full_name', { ascending: true });

    if (filters.role) query = query.eq('role', filters.role);
    if (filters.group_id) query = query.eq('group_id', filters.group_id);
    if (filters.q) query = query.ilike('full_name', `%${filters.q}%`);

    return unwrap(await query);
  }

  async findOne(id: string): Promise<Member> {
    return unwrap(
      await this.supabase.db
        .from(TABLE)
        .select('*, group:groups(id,name), household:households(id,name)')
        .eq('id', id)
        .single(),
    );
  }

  async create(dto: CreateMemberDto): Promise<Member> {
    return unwrap(
      await this.supabase.db.from(TABLE).insert(dto).select().single(),
    );
  }

  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
    return unwrap(
      await this.supabase.db
        .from(TABLE)
        .update(dto)
        .eq('id', id)
        .select()
        .single(),
    );
  }

  async remove(id: string): Promise<{ id: string }> {
    unwrap(
      await this.supabase.db.from(TABLE).delete().eq('id', id).select().single(),
    );
    return { id };
  }

  /** All trainings a member has enrolled in, with progress. */
  async trainingRecord(id: string) {
    return unwrap(
      await this.supabase.db
        .from('training_enrollments')
        .select('*, training:trainings(id,name,category,total_sessions)')
        .eq('member_id', id)
        .order('enrolled_at', { ascending: false }),
    );
  }
}
