import type { ReactNode } from 'react';

interface PrefFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export default function PrefField({ label, children, hint }: PrefFieldProps) {
  return (
    <div className='mb-4'>
      <label className='block text-white/80 text-sm mb-2'>{label}</label>
      {children}
      {hint && <p className='text-white/40 text-xs mt-1'>{hint}</p>}
    </div>
  );
}
