import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
  dir?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  name,
  id,
  autoComplete = 'current-password',
  required = false,
  className = '',
  dir = 'ltr',
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pl-12 h-12 ${className}`}
        dir={dir}
        name={name}
        id={id}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors"
      >
        {show ? (
          <EyeOff className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Eye className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
