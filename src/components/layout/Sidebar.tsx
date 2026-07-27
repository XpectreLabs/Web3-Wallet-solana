import { FC, useState } from 'react';
import { Home, History, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { C } from '../../utils/theme';

export type Tab = 'home' | 'history' | 'settings';

interface SidebarProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

const Sidebar: FC<SidebarProps> = ({ active, onChange }) => {
  // Estado para controlar si el sidebar está retraído o expandido
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <Home size={20} /> },
    { key: 'history', label: 'History', icon: <History size={20} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r bg-[#10131c]/60 backdrop-blur-md z-20 shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
        }`}
      style={{ borderColor: C.border }}
    >
      {/* Logo - Ahora es un botón que redirige al Dashboard (home) */}
      <button
        onClick={() => onChange('home')}
        title="Go to Dashboard"
        className={`p-6 flex items-center mb-4 shrink-0 overflow-hidden cursor-pointer border-none bg-transparent hover:opacity-80 transition-opacity text-left w-full focus:outline-none ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}
      >
        <img
          src="/Xpectre-logo.svg"
          alt="Xpectre Logo"
          className="h-8 w-auto object-contain select-none shrink-0"
        />
        {!isCollapsed && (
          <span className="text-white text-xl font-bold tracking-tight whitespace-nowrap animate-in fade-in duration-300">
            Xpectre
          </span>
        )}
      </button>

      {/* Navigation */}
      <div className="flex flex-col gap-2 px-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            title={isCollapsed ? t.label : undefined}
            className={`flex items-center rounded-xl transition-all cursor-pointer border-none text-left overflow-hidden focus:outline-none ${active === t.key
              ? 'bg-[#dea001]/10 text-[#dea001]'
              : 'bg-transparent text-[#7a8fa6] hover:bg-white/5 hover:text-white'
              } ${isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3.5'}`}
          >
            <div className="shrink-0">{t.icon}</div>
            {!isCollapsed && (
              <span className="font-semibold text-[15px] whitespace-nowrap animate-in fade-in duration-300">
                {t.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Botón para colapsar/expandir (Abajo) */}
      <div className="mt-auto p-4 flex justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 text-[#7a8fa6] hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center focus:outline-none ${isCollapsed ? 'w-full' : ''
            }`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;