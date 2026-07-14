import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';
import {
  CreatePairDto,
  CreateProgramDto,
  ProgressDto,
  UpdatePairDto,
} from './dto';

@Injectable()
export class DiscipleshipService {
  constructor(private readonly supabase: SupabaseService) {}

  // --- Programs -----------------------------------------------------------
  listPrograms() {
    return this.supabase.db
      .from('discipleship_programs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(unwrap);
  }

  createProgram(dto: CreateProgramDto) {
    return this.supabase.db
      .from('discipleship_programs')
      .insert(dto)
      .select()
      .single()
      .then(unwrap);
  }

  getProgram(id: string) {
    return this.supabase.db
      .from('discipleship_programs')
      .select('*')
      .eq('id', id)
      .single()
      .then(unwrap);
  }

  /**
   * Pastor overview: every mentoring pair in the program with completion %.
   * Backed by the discipleship_pair_summary view for real-time monitoring.
   */
  overview(programId: string) {
    return this.supabase.db
      .from('discipleship_pair_summary')
      .select('*')
      .eq('program_id', programId)
      .order('percent_complete', { ascending: false })
      .then(unwrap);
  }

  // --- Pairs --------------------------------------------------------------
  listPairs(programId?: string) {
    let query = this.supabase.db
      .from('discipleship_pairs')
      .select(
        '*, mentor:members!discipleship_pairs_mentor_id_fkey(id,full_name,church_role,group_position), trainee:members!discipleship_pairs_trainee_id_fkey(id,full_name,church_role,group_position)',
      )
      .order('created_at');
    if (programId) query = query.eq('program_id', programId);
    return query.then(unwrap);
  }

  createPair(dto: CreatePairDto) {
    return this.supabase.db
      .from('discipleship_pairs')
      .insert(dto)
      .select(
        '*, mentor:members!discipleship_pairs_mentor_id_fkey(id,full_name,church_role,group_position), trainee:members!discipleship_pairs_trainee_id_fkey(id,full_name,church_role,group_position)',
      )
      .single()
      .then(unwrap);
  }

  async getPair(id: string) {
    const pair = unwrap<Record<string, unknown>>(
      await this.supabase.db
        .from('discipleship_pairs')
        .select(
          '*, mentor:members!discipleship_pairs_mentor_id_fkey(id,full_name,church_role,group_position), trainee:members!discipleship_pairs_trainee_id_fkey(id,full_name,church_role,group_position), program:discipleship_programs(id,name,total_days)',
        )
        .eq('id', id)
        .single(),
    );
    const progress = unwrap(
      await this.supabase.db
        .from('discipleship_progress')
        .select('*')
        .eq('pair_id', id)
        .order('day_number'),
    );
    return { ...pair, progress };
  }

  updatePair(id: string, dto: UpdatePairDto) {
    return this.supabase.db
      .from('discipleship_pairs')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap);
  }

  async removePair(id: string) {
    unwrap(
      await this.supabase.db
        .from('discipleship_pairs')
        .delete()
        .eq('id', id)
        .select()
        .single(),
    );
    return { id };
  }

  // --- Daily progress form (filled by the mentor) -------------------------
  upsertProgress(pairId: string, dto: ProgressDto) {
    return this.supabase.db
      .from('discipleship_progress')
      .upsert(
        {
          pair_id: pairId,
          day_number: dto.day_number,
          completed: dto.completed ?? false,
          notes: dto.notes ?? null,
          entry_date: dto.entry_date ?? undefined,
        },
        { onConflict: 'pair_id,day_number' },
      )
      .select()
      .single()
      .then(unwrap);
  }

  // --- Private form link (opened by the mentor, no login) -----------------
  /** Resolve a pair by its shareable form_token, with program + progress. */
  async getPairByToken(token: string) {
    const pair = unwrap(
      await this.supabase.db
        .from('discipleship_pairs')
        .select(
          '*, mentor:members!discipleship_pairs_mentor_id_fkey(id,full_name), trainee:members!discipleship_pairs_trainee_id_fkey(id,full_name), program:discipleship_programs(id,name,total_days)',
        )
        .eq('form_token', token)
        .single(),
    ) as { id: string };
    const progress = unwrap(
      await this.supabase.db
        .from('discipleship_progress')
        .select('*')
        .eq('pair_id', pair.id)
        .order('day_number'),
    );
    return { ...pair, progress };
  }

  /** Upsert today's progress via the token — the mentor's daily form submit. */
  async submitProgressByToken(token: string, dto: ProgressDto) {
    const pair = unwrap(
      await this.supabase.db
        .from('discipleship_pairs')
        .select('id')
        .eq('form_token', token)
        .single(),
    ) as { id: string };
    return this.upsertProgress(pair.id, dto);
  }
}
