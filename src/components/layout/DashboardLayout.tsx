import { FC, useEffect, ReactNode } from 'react';
import Sidebar, { Tab } from './Sidebar';
import BottomNav from './BottomNav';
import TopHeader from './TopHeader';

import { NetworkUI } from '../../utils/theme';

interface DashboardLayoutProps {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  publicKeyStr: string;
  networkUI: NetworkUI;
  setNetworkUI: (n: NetworkUI) => void;
  autoConnect: boolean;
  setAutoConnect: (v: boolean) => void;
  onDisconnect: () => void;
  onGlobalSearch?: (query: string) => void;
  children: ReactNode;
}

const DashboardLayout: FC<DashboardLayoutProps> = ({
  activeTab,
  setActiveTab,
  publicKeyStr,
  networkUI,
  setNetworkUI,
  autoConnect,
  setAutoConnect,
  onDisconnect,
  onGlobalSearch,
  children,
}) => {
  // Scroll to top on tab change
  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="flex flex-col h-screen relative z-10 overflow-hidden">
      <div className="flex flex-1 overflow-hidden h-screen">
        {/* Desktop Sidebar */}
        <Sidebar active={activeTab} onChange={setActiveTab} />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Global Header */}
          <TopHeader
            publicKeyStr={publicKeyStr}
            networkUI={networkUI}
            setNetworkUI={setNetworkUI}
            autoConnect={autoConnect}
            setAutoConnect={setAutoConnect}
            onDisconnect={onDisconnect}
            onGlobalSearch={onGlobalSearch}
          />

          {/* Main Content Area */}
          <main
            className="flex-1 overflow-y-auto w-full"
            id="main-scroll"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="w-full max-w-[600px] md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-10 pb-24 md:pb-12">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Nav */}
          <BottomNav active={activeTab} onChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;