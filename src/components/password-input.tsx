'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ id, disabled, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return <div>
    <input {...props} id={inputId} disabled={disabled} type={visible ? 'text' : 'password'} />
    <button type="button" disabled={disabled} aria-controls={inputId} aria-pressed={visible}
      aria-label={visible ? 'Hide password' : 'Show password'}
      onClick={() => setVisible(value => !value)}
      className="mt-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {visible ? 'Hide password' : 'Show password'}
    </button>
  </div>;
}
