import { HTMLAttributes } from 'react';

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  centered?: boolean;
  narrow?: boolean;
  wide?: boolean;
}

export function PageShell({
  centered = false,
  narrow = false,
  wide = false,
  className = '',
  children,
  ...props
}: PageShellProps) {
  const maxWidth = narrow ? 'max-w-md' : wide ? 'max-w-6xl' : 'max-w-4xl';

  return (
    <div
      className={[
        'page-shell flex-1 w-full',
        centered ? 'flex flex-col items-center justify-center' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div className={`${maxWidth} mx-auto w-full p-4 md:p-6`}>{children}</div>
    </div>
  );
}
