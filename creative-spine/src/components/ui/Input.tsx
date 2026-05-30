import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>}
      <input
        className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
