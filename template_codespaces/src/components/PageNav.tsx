import { ReactNode } from "react";
import * as Icons from "lucide-react";

interface PageNavProps {
  onBack: () => void;
  title?: string;
  rightElement?: ReactNode;
  icon?: ReactNode;
}

export default function PageNav({ onBack, title, rightElement, icon }: PageNavProps) {
  return (
    <div className="navbar" style={{ justifyContent: 'flex-start', gap: icon ? '8px' : '10px' }}>
      <div className="nav-back" onClick={onBack}>
        <Icons.ChevronLeft size={16} color="var(--color-text-secondary)" />
      </div>
      {icon && <div className="nav-logo" style={{ marginRight: '4px' }}>{icon}</div>}
      {title && <span className="nav-title" style={{ marginLeft: icon ? 0 : undefined }}>{title}</span>}
      {rightElement}
    </div>
  );
}
