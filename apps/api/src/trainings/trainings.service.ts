import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@tog/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { unwrap } from '../common/supabase-result';
import {
  CreateTrainingDto,
  EnrollDto,
  SessionAttendanceDto,
  SessionDto,
  UpdateEnrollmentDto,
} from './dto';

@Injectable()
export class TrainingsService {
  constructor(private readonly supabase: SupabaseService) {}

  // --- Trainings ----------------------------------------------------------
  findAll() {
    return this.supabase.db
      .from('trainings')
      .select('*, trainer:members(id,full_name)')
      .order('created_at', { ascending: false })
      .then(unwrap);
  }

  async findOne(id: string) {
    const training = unwrap<Record<string, unknown>>(
      await this.supabase.db
        .from('trainings')
        .select('*, trainer:members(id,full_name)')
        .eq('id', id)
        .single(),
    );
    const sessions = unwrap(
      await this.supabase.db
        .from('training_sessions')
        .select('*')
        .eq('training_id', id)
        .order('session_number'),
    );
    const enrollments = unwrap(
      await this.supabase.db
        .from('training_enrollments')
        .select('*, member:members(id,full_name,church_role,group_position)')
        .eq('training_id', id)
        .order('enrolled_at'),
    );
    return { ...training, sessions, enrollments };
  }

  create(dto: CreateTrainingDto) {
    return this.supabase.db
      .from('trainings')
      .insert(dto)
      .select()
      .single()
      .then(unwrap);
  }

  update(id: string, dto: CreateTrainingDto) {
    return this.supabase.db
      .from('trainings')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap);
  }

  async remove(id: string) {
    unwrap(
      await this.supabase.db
        .from('trainings')
        .delete()
        .eq('id', id)
        .select()
        .single(),
    );
    return { id };
  }

  // --- Sessions -----------------------------------------------------------
  addSession(trainingId: string, dto: SessionDto) {
    return this.supabase.db
      .from('training_sessions')
      .insert({ ...dto, training_id: trainingId })
      .select()
      .single()
      .then(unwrap);
  }

  updateSession(sessionId: string, dto: Partial<SessionDto>) {
    return this.supabase.db
      .from('training_sessions')
      .update(dto)
      .eq('id', sessionId)
      .select()
      .single()
      .then(unwrap);
  }

  async removeSession(sessionId: string) {
    unwrap(
      await this.supabase.db
        .from('training_sessions')
        .delete()
        .eq('id', sessionId)
        .select()
        .single(),
    );
    return { id: sessionId };
  }

  // --- Enrollment ---------------------------------------------------------
  enroll(trainingId: string, dto: EnrollDto) {
    return this.supabase.db
      .from('training_enrollments')
      .insert({
        training_id: trainingId,
        member_id: dto.member_id,
        status: dto.status ?? EnrollmentStatus.Pending,
      })
      .select('*, member:members(id,full_name,church_role,group_position)')
      .single()
      .then(unwrap);
  }

  updateEnrollment(enrollmentId: string, dto: UpdateEnrollmentDto) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.status === EnrollmentStatus.Completed) {
      patch.completed_at = new Date().toISOString();
      if (dto.progress === undefined) patch.progress = 100;
    }
    return this.supabase.db
      .from('training_enrollments')
      .update(patch)
      .eq('id', enrollmentId)
      .select('*, member:members(id,full_name,church_role,group_position)')
      .single()
      .then(unwrap);
  }

  async removeEnrollment(enrollmentId: string) {
    unwrap(
      await this.supabase.db
        .from('training_enrollments')
        .delete()
        .eq('id', enrollmentId)
        .select()
        .single(),
    );
    return { id: enrollmentId };
  }

  // --- Namelist & session attendance -------------------------------------
  /**
   * Generate the checking namelist for a training: every approved/enrolled
   * member crossed with each session and whether they attended.
   */
  async namelist(trainingId: string) {
    const enrollments = unwrap(
      await this.supabase.db
        .from('training_enrollments')
        .select('id, member:members(id,full_name,church_role,group_position)')
        .eq('training_id', trainingId)
        .in('status', ['approved', 'in_progress', 'completed'])
        .order('id'),
    ) as Array<{ id: string; member: any }>;

    const sessions = unwrap(
      await this.supabase.db
        .from('training_sessions')
        .select('id, session_number, title, scheduled_at')
        .eq('training_id', trainingId)
        .order('session_number'),
    ) as Array<{ id: string }>;

    const sessionIds = sessions.map((s) => s.id);
    const attendance = sessionIds.length
      ? (unwrap(
          await this.supabase.db
            .from('training_attendance')
            .select('session_id, member_id, attended')
            .in('session_id', sessionIds),
        ) as Array<{ session_id: string; member_id: string; attended: boolean }>)
      : [];

    const attMap = new Map<string, boolean>();
    for (const a of attendance) {
      attMap.set(`${a.session_id}:${a.member_id}`, a.attended);
    }

    const rows = enrollments.map((e) => ({
      member: e.member,
      attendance: sessions.map((s: any) => ({
        session_id: s.id,
        session_number: s.session_number,
        attended: attMap.get(`${s.id}:${e.member.id}`) ?? false,
      })),
    }));

    return { sessions, rows };
  }

  recordSessionAttendance(sessionId: string, dto: SessionAttendanceDto) {
    const rows = dto.records.map((r) => ({
      session_id: sessionId,
      member_id: r.member_id,
      attended: r.attended,
      notes: r.notes ?? null,
    }));
    return this.supabase.db
      .from('training_attendance')
      .upsert(rows, { onConflict: 'session_id,member_id' })
      .select()
      .then(unwrap);
  }
}
