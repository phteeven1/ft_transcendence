import { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, id, name, autoComplete, className = '', ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;
    const inputName = name ?? inputId;

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={inputName}
          autoComplete={autoComplete}
          className={['clay-input', error ? 'clay-input-error' : '', className]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
