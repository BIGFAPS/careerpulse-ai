import { Activity } from "lucide-react";

export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
      <div className="bg-primary text-primary-foreground p-1 rounded-sm">
        <Activity className={className} />
      </div>
      <span>Career Pulse AI</span>
    </div>
  );
}
