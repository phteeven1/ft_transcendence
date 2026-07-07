import { HTMLAttributes } from 'react';

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  centered?: boolean;
  narrow?: boolean;
}

export function PageShell({
  centered = false,
  narrow = false,
  className = '',
  children,
  ...props
}: PageShellProps) {
  const maxWidth = narrow ? 'max-w-md' : 'max-w-4xl';

  return (
    <div
      className={[
        'page-shell min-h-[calc(100vh-4rem)]',
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
