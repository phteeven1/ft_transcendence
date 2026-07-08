import { HTMLAttributes } from 'react';

export type PanelProps = HTMLAttributes<HTMLDivElement>;

export function Panel({ className = '', children, ...props }: PanelProps) {
  return (
    <div className={['clay-panel', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}
