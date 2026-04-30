import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  action: ReactNode;
}

export function PageHeader({ icon: Icon, title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl gradient-brand-soft flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {action}
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
