import { FC } from 'react';
import { Home, History, Settings } from 'lucide-react';
import { Tab } from './Sidebar';

import { C } from '../../utils/theme';

interface BottomNavProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

const BottomNav: FC<BottomNavProps> = ({ active, onChange }) => {
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <Home size={24} /> },
    { key: 'history', label: 'History', icon: <History size={24} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={24} /> },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 w-full z-50 flex border-t"
      style={{
        backgroundColor: 'rgba(16, 19, 28, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: C.border,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="w-full flex">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="flex-1 flex flex-col items-center gap-1.5 py-3.5 bg-transparent border-none cursor-pointer transition-colors border-t-2"
            style={{
              color: active === t.key ? C.gold : C.muted,
              borderColor: active === t.key ? C.gold : 'transparent',
              marginTop: -1,
            }}
          >
            {t.icon}
            <span className="text-[11px] font-bold">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;