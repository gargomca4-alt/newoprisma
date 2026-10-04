import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  action: ReactNode;
}

export function PageHeader({ icon: Icon, title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl gradient-brand-soft flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-foreground">{title}</h1>
      </div>
      {action && (
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {action}
        </div>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium">{label}</label>{children}</div>;
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-2 py-1.5 rounded-md bg-muted/50">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
