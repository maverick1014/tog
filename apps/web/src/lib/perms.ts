import { AccountRole } from '@tog/shared';

/**
 * Role → capability map. Mirrors the server-side gate in the API route so the UI
 * only ever offers actions the current account can actually perform. The server
 * remains authoritative; this is purely for hiding/disabling UI (rule G2).
 */
export function can(role: string | undefined) {
  const r = role ?? '';
  return {
    /** Create / edit pastoral data (anything but a read-only account). */
    write: r !== AccountRole.ReadOnly,
    /** Hard-delete records — super_admin / admin only. */
    delete: r === AccountRole.SuperAdmin || r === AccountRole.Admin,
    /** Manage login accounts (read + write) — super_admin only. */
    manageAccounts: r === AccountRole.SuperAdmin,
  };
}

export type Perms = ReturnType<typeof can>;
