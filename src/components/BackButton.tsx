import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
}

export default function BackButton({ to, onClick }: BackButtonProps) {
  const navigate = useNavigate();
  const { dir } = useApp();
  const Icon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (to) { navigate(to); return; }
    navigate(-1);
  };

  return (
    <button
      onClick={handleClick}
      className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-95 transition-transform"
    >
      <Icon className="w-5 h-5 text-foreground stroke-[1.8]" />
    </button>
  );
}
