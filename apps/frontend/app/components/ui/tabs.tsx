import { ButtonHTMLAttributes, HTMLAttributes } from 'react';

export type TabsProps = HTMLAttributes<HTMLDivElement>;

export function Tabs({ className = '', children, ...props }: TabsProps) {
  return (
    <div className={['clay-tabs', className].filter(Boolean).join(' ')} role="tablist" {...props}>
      {children}
    </div>
  );
}

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  panelId?: string;
}

export function Tab({
  active = false,
  panelId,
  className = '',
  type = 'button',
  ...props
}: TabProps) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      className={[active ? 'clay-tab clay-tab-active' : 'clay-tab', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  panelId: string;
  labelledBy: string;
  hidden?: boolean;
}

export function TabPanel({
  panelId,
  labelledBy,
  hidden = false,
  className = '',
  children,
  ...props
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
      hidden={hidden}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
