import { Package } from 'lucide-react';

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white">
        <Package className="h-5 w-5" />
      </div>
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight">Inventory</span>
      )}
    </div>
  );
}
