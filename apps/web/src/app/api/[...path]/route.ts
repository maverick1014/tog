import { getDb, HttpError, json, unwrap } from '@/lib/server/db';
import {
  clearCookie,
  getSession,
  sessionCookie,
  signSession,
  verifyPassword,
} from '@/lib/server/auth';

/**
 * The whole REST API, ported from the NestJS app into a single Cloudflare
 * Workers-compatible route handler. Paths and response shapes match the
 * original `/api/*` contract 1:1 so the frontend is unchanged.
 */

type Ctx = { params: Promise<{ path: string[] }> };

const MEMBER_SELECT = '*, group:groups(id,name), household:households(id,name)';
const MEMBER_BRIEF = 'id,full_name,church_role,group_position';
const PAIR_SELECT =
  '*, mentor:members!discipleship_pairs_mentor_id_fkey(id,full_name,church_role,group_position), trainee:members!discipleship_pairs_trainee_id_fkey(id,full_name,church_role,group_position)';
const ACCOUNT_SELECT = `*, member:members(${MEMBER_BRIEF})`;

async function dispatch(method: string, req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const p = path ?? [];
  const db = getDb();
  const url = new URL(req.url);
  const q = url.searchParams;
  const body = async () => {
    try {
      return (await req.json()) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  };

  const [r0, r1, r2, r3] = p;

  // ---- Auth + access control ------------------------------------------------
  if (r0 === 'auth') return authRoute(method, req, p, db);

  // The mentor daily form (/d/<token>) is public by design — no session.
  const isPublicForm = r0 === 'discipleship' && r1 === 'form';
  if (!isPublicForm) {
    const session = await getSession(req);
    if (!session) throw new HttpError(401, '未登录');
    if (method !== 'GET') {
      // Permission matrix enforcement.
      if (session.role === 'readonly') throw new HttpError(403, '只读账户无法修改');
      if (r0 === 'accounts' && session.role !== 'super_admin')
        throw new HttpError(403, '仅超级管理员可管理登录账户');
      if (method === 'DELETE' && !['super_admin', 'admin'].includes(session.role))
        throw new HttpError(403, '当前角色无删除权限');
    }
  }

  // ---- Members --------------------------------------------------------------
  if (r0 === 'members') {
    if (!r1) {
      if (method === 'GET') {
        let query = db
          .from('members')
          .select(MEMBER_SELECT)
          .order('full_name', { ascending: true });
        if (q.get('church_role')) query = query.eq('church_role', q.get('church_role'));
        if (q.get('group_position')) query = query.eq('group_position', q.get('group_position'));
        if (q.get('group_id')) query = query.eq('group_id', q.get('group_id'));
        if (q.get('q')) query = query.ilike('full_name', `%${q.get('q')}%`);
        return json(unwrap(await query));
      }
      if (method === 'POST') {
        return json(unwrap(await db.from('members').insert(await body()).select().single()));
      }
    } else if (r2 === 'trainings' && method === 'GET') {
      return json(
        unwrap(
          await db
            .from('training_enrollments')
            .select('*, training:trainings(id,name,category,total_sessions)')
            .eq('member_id', r1)
            .order('enrolled_at', { ascending: false }),
        ),
      );
    } else if (r2 === 'avatar' && method === 'POST') {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new HttpError(400, '缺少文件');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${r1}/${Date.now()}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const up = await db.storage
        .from('avatars')
        .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: true });
      if (up.error) throw new HttpError(500, up.error.message);
      const { data: pub } = db.storage.from('avatars').getPublicUrl(path);
      return json(
        unwrap(
          await db
            .from('members')
            .update({ avatar_url: pub.publicUrl })
            .eq('id', r1)
            .select()
            .single(),
        ),
      );
    } else if (!r2) {
      if (method === 'GET')
        return json(unwrap(await db.from('members').select(MEMBER_SELECT).eq('id', r1).single()));
      if (method === 'PATCH')
        return json(unwrap(await db.from('members').update(await body()).eq('id', r1).select().single()));
      if (method === 'DELETE') {
        unwrap(await db.from('members').delete().eq('id', r1).select().single());
        return json({ id: r1 });
      }
    }
  }

  // ---- Groups ---------------------------------------------------------------
  if (r0 === 'groups') {
    // /groups/meetings/:meetingId ...
    if (r1 === 'meetings' && r2) {
      if (r3 === 'attendance' && method === 'POST') {
        const dto = await body();
        const records = (dto.records as Array<Record<string, unknown>>).map((r) => ({
          meeting_id: r2,
          member_id: r.member_id,
          status: r.status ?? 'present',
        }));
        return json(
          unwrap(
            await db
              .from('group_attendance')
              .upsert(records, { onConflict: 'meeting_id,member_id' })
              .select(),
          ),
        );
      }
      if (!r3 && method === 'DELETE') {
        unwrap(await db.from('group_meetings').delete().eq('id', r2).select().single());
        return json({ id: r2 });
      }
    } else if (!r1) {
      if (method === 'GET') return json(unwrap(await db.from('groups').select('*').order('name')));
      if (method === 'POST')
        return json(unwrap(await db.from('groups').insert(await body()).select().single()));
    } else if (r2 === 'attendance' && method === 'GET') {
      return json(await groupAttendance(db, r1));
    } else if (r2 === 'meetings' && method === 'POST') {
      const dto = await body();
      return json(
        unwrap(
          await db
            .from('group_meetings')
            .insert({ group_id: r1, meeting_date: dto.meeting_date, note: dto.note ?? null })
            .select()
            .single(),
        ),
      );
    } else if (!r2) {
      if (method === 'GET') {
        const group = unwrap<Record<string, unknown>>(await db.from('groups').select('*').eq('id', r1).single());
        const members = unwrap(
          await db
            .from('members')
            .select('id,full_name,group_position,status')
            .eq('group_id', r1)
            .order('full_name'),
        );
        return json({ ...group, members });
      }
      if (method === 'PATCH')
        return json(unwrap(await db.from('groups').update(await body()).eq('id', r1).select().single()));
      if (method === 'DELETE') {
        unwrap(await db.from('groups').delete().eq('id', r1).select().single());
        return json({ id: r1 });
      }
    }
  }

  // ---- Events ---------------------------------------------------------------
  if (r0 === 'events') {
    if (!r1) {
      if (method === 'GET')
        return json(unwrap(await db.from('events').select('*').order('starts_at', { ascending: false })));
      if (method === 'POST')
        return json(unwrap(await db.from('events').insert(await body()).select().single()));
    } else if (r2 === 'attendance' && method === 'POST') {
      const dto = await body();
      const records = (dto.records as Array<Record<string, unknown>>).map((r) => ({
        event_id: r1,
        member_id: r.member_id,
        status: r.status ?? 'present',
        notes: r.notes ?? null,
      }));
      return json(
        unwrap(
          await db.from('event_attendance').upsert(records, { onConflict: 'event_id,member_id' }).select(),
        ),
      );
    } else if (!r2) {
      if (method === 'GET') {
        const event = unwrap<Record<string, unknown>>(await db.from('events').select('*').eq('id', r1).single());
        const attendance = unwrap(
          await db
            .from('event_attendance')
            .select('*, member:members(id,full_name,church_role,group_position)')
            .eq('event_id', r1),
        );
        return json({ ...event, attendance });
      }
      if (method === 'PATCH')
        return json(unwrap(await db.from('events').update(await body()).eq('id', r1).select().single()));
      if (method === 'DELETE') {
        unwrap(await db.from('events').delete().eq('id', r1).select().single());
        return json({ id: r1 });
      }
    }
  }

  // ---- Donations ------------------------------------------------------------
  if (r0 === 'donations') {
    if (r1 === 'summary' && method === 'GET') {
      const rows = unwrap(await db.from('donations').select('fund, amount')) as Array<{
        fund: string;
        amount: number;
      }>;
      const byFund: Record<string, number> = {};
      let total = 0;
      for (const row of rows) {
        const amt = Number(row.amount);
        byFund[row.fund] = (byFund[row.fund] ?? 0) + amt;
        total += amt;
      }
      return json({ total, byFund });
    }
    if (!r1) {
      if (method === 'GET') {
        let query = db
          .from('donations')
          .select('*, member:members(id,full_name)')
          .order('donated_at', { ascending: false });
        if (q.get('member_id')) query = query.eq('member_id', q.get('member_id'));
        if (q.get('fund')) query = query.eq('fund', q.get('fund'));
        return json(unwrap(await query));
      }
      if (method === 'POST')
        return json(unwrap(await db.from('donations').insert(await body()).select().single()));
    } else if (!r2) {
      if (method === 'PATCH')
        return json(unwrap(await db.from('donations').update(await body()).eq('id', r1).select().single()));
      if (method === 'DELETE') {
        unwrap(await db.from('donations').delete().eq('id', r1).select().single());
        return json({ id: r1 });
      }
    }
  }

  // ---- Trainings ------------------------------------------------------------
  if (r0 === 'trainings') {
    // /trainings/sessions/:sessionId ...
    if (r1 === 'sessions' && r2) {
      if (r3 === 'attendance' && method === 'POST') {
        const dto = await body();
        const records = (dto.records as Array<Record<string, unknown>>).map((r) => ({
          session_id: r2,
          member_id: r.member_id,
          attended: r.attended,
          notes: r.notes ?? null,
        }));
        return json(
          unwrap(
            await db
              .from('training_attendance')
              .upsert(records, { onConflict: 'session_id,member_id' })
              .select(),
          ),
        );
      }
      if (!r3) {
        if (method === 'PATCH')
          return json(
            unwrap(await db.from('training_sessions').update(await body()).eq('id', r2).select().single()),
          );
        if (method === 'DELETE') {
          unwrap(await db.from('training_sessions').delete().eq('id', r2).select().single());
          return json({ id: r2 });
        }
      }
    }
    // /trainings/enrollments/:enrollmentId
    else if (r1 === 'enrollments' && r2) {
      if (method === 'PATCH') {
        const dto = await body();
        const patch: Record<string, unknown> = { ...dto };
        if (dto.status === 'completed') {
          patch.completed_at = new Date().toISOString();
          if (dto.progress === undefined) patch.progress = 100;
        }
        return json(
          unwrap(
            await db
              .from('training_enrollments')
              .update(patch)
              .eq('id', r2)
              .select('*, member:members(id,full_name,church_role,group_position)')
              .single(),
          ),
        );
      }
      if (method === 'DELETE') {
        unwrap(await db.from('training_enrollments').delete().eq('id', r2).select().single());
        return json({ id: r2 });
      }
    }
    // /trainings ...
    else if (!r1) {
      if (method === 'GET')
        return json(
          unwrap(
            await db
              .from('trainings')
              .select('*, trainer:members(id,full_name)')
              .order('created_at', { ascending: false }),
          ),
        );
      if (method === 'POST')
        return json(unwrap(await db.from('trainings').insert(await body()).select().single()));
    }
    // /trainings/:id ...
    else if (r1 && !r2) {
      if (method === 'GET') {
        const training = unwrap<Record<string, unknown>>(
          await db.from('trainings').select('*, trainer:members(id,full_name)').eq('id', r1).single(),
        );
        const sessions = unwrap(
          await db.from('training_sessions').select('*').eq('training_id', r1).order('session_number'),
        );
        const enrollments = unwrap(
          await db
            .from('training_enrollments')
            .select('*, member:members(id,full_name,church_role,group_position)')
            .eq('training_id', r1)
            .order('enrolled_at'),
        );
        return json({ ...training, sessions, enrollments });
      }
      if (method === 'PATCH')
        return json(unwrap(await db.from('trainings').update(await body()).eq('id', r1).select().single()));
      if (method === 'DELETE') {
        unwrap(await db.from('trainings').delete().eq('id', r1).select().single());
        return json({ id: r1 });
      }
    }
    // /trainings/:id/{namelist,sessions,enroll}
    else if (r1 && r2) {
      if (r2 === 'namelist' && method === 'GET') return json(await namelist(db, r1));
      if (r2 === 'sessions' && method === 'POST')
        return json(
          unwrap(
            await db
              .from('training_sessions')
              .insert({ ...(await body()), training_id: r1 })
              .select()
              .single(),
          ),
        );
      if (r2 === 'enroll' && method === 'POST') {
        const dto = await body();
        return json(
          unwrap(
            await db
              .from('training_enrollments')
              .insert({ training_id: r1, member_id: dto.member_id, status: dto.status ?? 'pending' })
              .select('*, member:members(id,full_name,church_role,group_position)')
              .single(),
          ),
        );
      }
    }
  }

  // ---- Discipleship ---------------------------------------------------------
  if (r0 === 'discipleship') {
    if (r1 === 'programs') {
      if (!r2) {
        if (method === 'GET')
          return json(
            unwrap(await db.from('discipleship_programs').select('*').order('created_at', { ascending: false })),
          );
        if (method === 'POST')
          return json(unwrap(await db.from('discipleship_programs').insert(await body()).select().single()));
      } else if (r3 === 'overview' && method === 'GET') {
        return json(
          unwrap(
            await db
              .from('discipleship_pair_summary')
              .select('*')
              .eq('program_id', r2)
              .order('percent_complete', { ascending: false }),
          ),
        );
      } else if (!r3 && method === 'GET') {
        return json(unwrap(await db.from('discipleship_programs').select('*').eq('id', r2).single()));
      }
    } else if (r1 === 'pairs') {
      if (!r2) {
        if (method === 'GET') {
          let query = db.from('discipleship_pairs').select(PAIR_SELECT).order('created_at');
          if (q.get('program_id')) query = query.eq('program_id', q.get('program_id'));
          return json(unwrap(await query));
        }
        if (method === 'POST')
          return json(unwrap(await db.from('discipleship_pairs').insert(await body()).select(PAIR_SELECT).single()));
      } else if (r3 === 'progress' && method === 'POST') {
        return json(await upsertProgress(db, r2, await body()));
      } else if (!r3) {
        if (method === 'GET') {
          const pair = unwrap<Record<string, unknown>>(
            await db
              .from('discipleship_pairs')
              .select(`${PAIR_SELECT}, program:discipleship_programs(id,name,total_days)`)
              .eq('id', r2)
              .single(),
          );
          const progress = unwrap(
            await db.from('discipleship_progress').select('*').eq('pair_id', r2).order('day_number'),
          );
          return json({ ...pair, progress });
        }
        if (method === 'PATCH')
          return json(unwrap(await db.from('discipleship_pairs').update(await body()).eq('id', r2).select().single()));
        if (method === 'DELETE') {
          unwrap(await db.from('discipleship_pairs').delete().eq('id', r2).select().single());
          return json({ id: r2 });
        }
      }
    } else if (r1 === 'form' && r2) {
      const pair = unwrap(
        await db
          .from('discipleship_pairs')
          .select(
            '*, mentor:members!discipleship_pairs_mentor_id_fkey(id,full_name), trainee:members!discipleship_pairs_trainee_id_fkey(id,full_name), program:discipleship_programs(id,name,total_days)',
          )
          .eq('form_token', r2)
          .single(),
      ) as { id: string };
      if (r3 === 'progress' && method === 'POST') {
        return json(await upsertProgress(db, pair.id, await body()));
      }
      if (!r3 && method === 'GET') {
        const progress = unwrap(
          await db.from('discipleship_progress').select('*').eq('pair_id', pair.id).order('day_number'),
        );
        return json({ ...pair, progress });
      }
    }
  }

  // ---- Accounts -------------------------------------------------------------
  if (r0 === 'accounts') {
    if (!r1) {
      if (method === 'GET')
        return json(unwrap(await db.from('app_users').select(ACCOUNT_SELECT).order('created_at', { ascending: true })));
      if (method === 'POST')
        return json(unwrap(await db.from('app_users').insert(await body()).select(ACCOUNT_SELECT).single()));
    } else if (!r2) {
      if (method === 'GET')
        return json(unwrap(await db.from('app_users').select(ACCOUNT_SELECT).eq('id', r1).single()));
      if (method === 'PATCH')
        return json(unwrap(await db.from('app_users').update(await body()).eq('id', r1).select(ACCOUNT_SELECT).single()));
      if (method === 'DELETE') {
        unwrap(await db.from('app_users').delete().eq('id', r1).select().single());
        return json({ id: r1 });
      }
    }
  }

  throw new HttpError(404, `No route for ${method} /api/${p.join('/')}`);
}

// --- Shared helpers ---------------------------------------------------------

async function upsertProgress(
  db: ReturnType<typeof getDb>,
  pairId: string,
  dto: Record<string, unknown>,
) {
  return unwrap(
    await db
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
      .single(),
  );
}

async function groupAttendance(db: ReturnType<typeof getDb>, groupId: string) {
  const meetings = unwrap(
    await db
      .from('group_meetings')
      .select('id, meeting_date, note')
      .eq('group_id', groupId)
      .order('meeting_date'),
  ) as Array<{ id: string; meeting_date: string; note: string | null }>;

  const members = unwrap(
    await db
      .from('members')
      .select('id, full_name, church_role, group_position')
      .eq('group_id', groupId)
      .order('full_name'),
  ) as Array<{ id: string; full_name: string }>;

  const meetingIds = meetings.map((m) => m.id);
  const att = meetingIds.length
    ? (unwrap(
        await db
          .from('group_attendance')
          .select('meeting_id, member_id, status')
          .in('meeting_id', meetingIds),
      ) as Array<{ meeting_id: string; member_id: string; status: string }>)
    : [];

  const map = new Map<string, string>();
  for (const a of att) map.set(`${a.meeting_id}:${a.member_id}`, a.status);

  const rows = members.map((m) => ({
    member: m,
    cells: meetings.map((mt) => ({
      meeting_id: mt.id,
      status: map.get(`${mt.id}:${m.id}`) ?? null,
    })),
  }));
  return { meetings, rows };
}

async function namelist(db: ReturnType<typeof getDb>, trainingId: string) {
  const enrollments = unwrap(
    await db
      .from('training_enrollments')
      .select('id, member:members(id,full_name,church_role,group_position)')
      .eq('training_id', trainingId)
      .in('status', ['approved', 'in_progress', 'completed'])
      .order('id'),
  ) as unknown as Array<{ id: string; member: { id: string } }>;

  const sessions = unwrap(
    await db
      .from('training_sessions')
      .select('id, session_number, title, scheduled_at')
      .eq('training_id', trainingId)
      .order('session_number'),
  ) as Array<{ id: string; session_number: number }>;

  const sessionIds = sessions.map((s) => s.id);
  const attendance = sessionIds.length
    ? (unwrap(
        await db
          .from('training_attendance')
          .select('session_id, member_id, attended')
          .in('session_id', sessionIds),
      ) as Array<{ session_id: string; member_id: string; attended: boolean }>)
    : [];

  const attMap = new Map<string, boolean>();
  for (const a of attendance) attMap.set(`${a.session_id}:${a.member_id}`, a.attended);

  const rows = enrollments.map((e) => ({
    member: e.member,
    attendance: sessions.map((s) => ({
      session_id: s.id,
      session_number: s.session_number,
      attended: attMap.get(`${s.id}:${e.member.id}`) ?? false,
    })),
  }));

  return { sessions, rows };
}

// --- Auth routes ------------------------------------------------------------

async function authRoute(
  method: string,
  req: Request,
  p: string[],
  db: ReturnType<typeof getDb>,
): Promise<Response> {
  if (p[1] === 'login' && method === 'POST') {
    const dto = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    const res = await db
      .from('app_users')
      .select('id, email, account_role, status, password_hash, member:members(id,full_name)')
      .eq('email', (dto.email ?? '').toLowerCase().trim())
      .maybeSingle();
    if (res.error) throw new HttpError(500, res.error.message);
    const user = res.data as {
      id: string;
      email: string;
      account_role: string;
      status: string;
      password_hash: string | null;
      member: { id: string; full_name: string } | null;
    } | null;
    if (!user || user.status !== 'active') throw new HttpError(401, '账户不存在或已停用');
    const ok = await verifyPassword(dto.password ?? '', user.password_hash);
    if (!ok) throw new HttpError(401, '邮箱或密码错误');
    await db
      .from('app_users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', user.id);
    const name = user.member?.full_name ?? user.email;
    const token = await signSession({
      sub: user.id,
      role: user.account_role,
      member: user.member?.id ?? null,
      name,
    });
    return new Response(
      JSON.stringify({ id: user.id, email: user.email, account_role: user.account_role, name }),
      { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': sessionCookie(token) } },
    );
  }
  if (p[1] === 'logout' && method === 'POST') {
    return new Response(null, { status: 204, headers: { 'set-cookie': clearCookie() } });
  }
  if (p[1] === 'me' && method === 'GET') {
    const s = await getSession(req);
    if (!s) throw new HttpError(401, '未登录');
    return json({ id: s.sub, role: s.role, member: s.member, name: s.name });
  }
  throw new HttpError(404, `No auth route for ${method} /api/${p.join('/')}`);
}

// --- HTTP method entry points ----------------------------------------------

async function run(method: string, req: Request, ctx: Ctx): Promise<Response> {
  try {
    return await dispatch(method, req, ctx);
  } catch (e) {
    if (e instanceof HttpError) return json({ message: e.message }, e.status);
    return json({ message: (e as Error).message ?? 'Internal error' }, 500);
  }
}

export const GET = (req: Request, ctx: Ctx) => run('GET', req, ctx);
export const POST = (req: Request, ctx: Ctx) => run('POST', req, ctx);
export const PATCH = (req: Request, ctx: Ctx) => run('PATCH', req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => run('DELETE', req, ctx);
