import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

/** 共享的纯样式基元（不含业务逻辑）；深色模式靠 dark: 变体 */

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export function Toggle({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        checked ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600',
      )}
    >
      <span
        className={cx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ variant = 'secondary', className, ...props }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium ' +
    'transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-accent cursor-pointer';
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 ' +
      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
    danger:
      'text-slate-500 hover:bg-red-50 hover:text-red-600 ' +
      'dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400',
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

const fieldCls =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-accent dark:border-slate-600 dark:bg-slate-800 ' +
  'dark:text-slate-100 dark:placeholder:text-slate-500';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldCls, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldCls, 'cursor-pointer', className)} {...props} />;
}

export const card =
  'rounded-card border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';
