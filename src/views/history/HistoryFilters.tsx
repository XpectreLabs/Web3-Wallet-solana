// src/views/history/HistoryFilters.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Filter and search bar component for transaction history.
//
// Responsibilities:
//   - Display filter buttons (All / Sent / Received)
//   - Provide search input for filtering by address
//   - Handle filter state changes
//
// This component is pure UI — all filtering logic lives in HistoryView.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { FC } from 'react';
import { Search, X } from 'lucide-react';
import { C } from '../../utils/theme';

type FilterType = 'all' | 'sent' | 'received';

interface HistoryFiltersProps {
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  searchAddress: string;
  setSearchAddress: (address: string) => void;
}

export const HistoryFilters: FC<HistoryFiltersProps> = ({
  filterType,
  setFilterType,
  searchAddress,
  setSearchAddress,
}) => {
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'received', label: 'Received' },
  ];

  return (
    <div className="mb-8 space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setFilterType(filter.key)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-[14px] transition-all cursor-pointer border ${{
              'all': 'active',
              'sent': 'active',
              'received': 'active'
            }[filterType === filter.key ? 'active' : '']}`}
            style={{
              backgroundColor: filterType === filter.key ? C.gold : C.surface,
              color: filterType === filter.key ? C.bg : C.text,
              borderColor: filterType === filter.key ? C.gold : C.border,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 border"
        style={{ backgroundColor: C.surface, borderColor: C.border }}
      >
        <Search size={18} style={{ color: C.muted, flexShrink: 0 }} />
        {/* sr-only label: visually hidden but read by screen readers */}
        <label htmlFor="history-search" className="sr-only">Search by wallet address</label>
        <input
          id="history-search"
          type="text"
          placeholder="Search by wallet address..."
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          className="flex-1 bg-transparent outline-none text-white placeholder-[#7a8fa6] text-[14px]"
        />
        {searchAddress && (
          <button
            onClick={() => setSearchAddress('')}
            aria-label="Clear search"
            className="p-1 hover:bg-white/5 rounded transition-colors cursor-pointer"
            style={{ color: C.muted }}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
