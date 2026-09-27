import React from 'react';
import { PERSONA_CONFIG, type PersonaTag } from '../../types';

interface PersonaBadgeProps {
  tag: PersonaTag;
  size?: 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
}

export const PersonaBadge: React.FC<PersonaBadgeProps> = ({
  tag,
  size = 'md',
  onClick,
  active = false,
}) => {
  const meta = PERSONA_CONFIG[tag];
  if (!meta) return null;

  const isClickable = !!onClick;

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        borderColor: active ? meta.color : 'transparent',
      }}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full transition-all duration-200 select-none ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm'
      } ${
        isClickable
          ? 'cursor-pointer hover:scale-105 active:scale-95'
          : ''
      } ${
        active
          ? 'bg-slate-800 text-white shadow-md ring-1'
          : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60'
      }`}
    >
      <span className="text-sm leading-none">{meta.emoji}</span>
      <span style={{ color: active ? meta.color : undefined }}>{meta.label}</span>
    </span>
  );
};
