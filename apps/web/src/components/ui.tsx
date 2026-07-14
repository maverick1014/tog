'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { initialOf, roleDot, roleTagStyle } from '@/lib/labels';

/* -------------------------------------------------------------------------
 * State helpers
 * ---------------------------------------------------------------------- */

export function Loading() {
  return <div className="loading">加载中…</div>;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="error-banner">⚠️ {message}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/* -------------------------------------------------------------------------
 * Avatar, badges
 * ---------------------------------------------------------------------- */

export function Avatar({
  name,
  size = 'sm',
}: {
  name: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  return <div className={`avatar ${size === 'sm' ? '' : size}`}>{initialOf(name)}</div>;
}

export function Badge({
  tone,
  dot,
  children,
}: {
  tone: string;
  dot?: string;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <i className="dot" style={{ background: dot }} />}
      {children}
    </span>
  );
}

/** Derived-identity badge using the design's per-role tag palette + dot. */
export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="badge" style={roleTagStyle(role)}>
      <i className="dot" style={{ background: roleDot(role) }} />
      {role}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Card
 * ---------------------------------------------------------------------- */

export function Card({
  title,
  right,
  children,
  style,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={style}>
      {(title || right) && (
        <div className="card-head">
          {typeof title === 'string' ? <h3>{title}</h3> : title}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Progress bar
 * ---------------------------------------------------------------------- */

export function ProgressBar({
  percent,
  label,
  thin,
}: {
  percent: number;
  label?: string;
  thin?: boolean;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="progress-row">
      <div className={`bar ${thin ? 'thin' : ''}`}>
        <span style={{ width: `${p}%` }} />
      </div>
      <span className="pct">{label ?? `${p}%`}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Toggle switch
 * ---------------------------------------------------------------------- */

export function Switch({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={`switch ${on ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={on}>
      <div className="knob" />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Modal
 * ---------------------------------------------------------------------- */

export function Modal({
  title,
  onClose,
  children,
  size,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'wide' | 'narrow';
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${size ?? ''}`} onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Toast
 * ---------------------------------------------------------------------- */

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
