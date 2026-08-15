import { FC } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

import { C } from '../../utils/theme';

const Toggle: FC<ToggleProps> = ({ checked, onChange }) => {
  return (
    <button
      onClick={onChange}
      aria-label="Toggle"
      className="relative flex items-center cursor-pointer transition-all duration-200"
      style={{
        width: 44,
        height: 24,
        backgroundColor: checked ? C.gold : 'transparent',
        border: `1px solid ${checked ? C.gold : C.border}`,
        borderRadius: 12,
      }}
    >
      <div
        className="absolute rounded-full transition-all duration-200"
        style={{
          top: 2,
          left: checked ? 22 : 2,
          width: 18,
          height: 18,
          backgroundColor: checked ? C.bg : C.muted,
        }}
      />
    </button>
  );
};

export default Toggle;
