'use client';

import { useEffect, useState } from 'react';
import ReactSelectAsync from 'react-select';
import type { Props as ReactSelectProps, StylesConfig, GroupBase } from 'react-select';

export type SelectOption = { value: string; label: string };

export interface ReactSelectWrapperProps<
  Option extends SelectOption = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> extends Omit<ReactSelectProps<Option, IsMulti, Group>, 'styles'> {
  width?: string;
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: { controlHeight: 28, fontSize: 11, pad: '0 6px', optionPad: '4px 8px' },
  md: { controlHeight: 36, fontSize: 13, pad: '0 8px', optionPad: '8px 12px' },
};

function baseStyles<
  Option extends SelectOption,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
>(s: { controlHeight: number; fontSize: number; pad: string; optionPad: string }): StylesConfig<Option, IsMulti, Group> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: s.controlHeight,
      height: 'auto',
      backgroundColor: 'var(--app-surface)',
      borderColor: state.isFocused ? 'var(--app-accent)' : 'var(--app-border)',
      borderWidth: 1,
      borderRadius: 6,
      boxShadow: state.isFocused ? '0 0 0 1px var(--app-accent)' : 'none',
      cursor: 'pointer',
      '&:hover': {
        borderColor: 'var(--app-border-strong)',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: s.pad,
      gap: 2,
    }),
    input: (base) => ({
      ...base,
      color: 'var(--app-text)',
      fontSize: s.fontSize,
      margin: 0,
      padding: 0,
      '& input': {
        color: 'var(--app-text) !important',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--app-text-dim)',
      fontSize: s.fontSize,
      margin: 0,
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--app-text)',
      fontSize: s.fontSize,
      margin: 0,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: s.controlHeight,
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: 'var(--app-text-dim)',
      padding: s.controlHeight === 28 ? '0 4px' : '0 8px',
      transition: 'transform 0.15s ease',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      '&:hover': { color: 'var(--app-text)' },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'var(--app-text-dim)',
      padding: '0 4px',
      cursor: 'pointer',
      '&:hover': { color: 'var(--app-text)' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--app-panel)',
      border: '1px solid var(--app-border)',
      borderRadius: 6,
      boxShadow: 'var(--shadow-lg, 0 4px 24px rgba(0,0,0,0.3))',
      zIndex: 110,
      overflow: 'hidden',
      marginTop: 4,
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: 240,
      '::-webkit-scrollbar': { width: 6 },
      '::-webkit-scrollbar-track': { background: 'transparent' },
      '::-webkit-scrollbar-thumb': { background: 'var(--app-border)', borderRadius: 3 },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'var(--app-accent-soft)'
        : state.isFocused
          ? 'var(--app-surface)'
          : 'transparent',
      color: state.isSelected ? 'var(--app-accent)' : 'var(--app-text)',
      fontSize: s.fontSize,
      padding: s.optionPad,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      '&:active': { backgroundColor: 'var(--app-accent-soft)' },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: 'var(--app-text-dim)',
      fontSize: s.fontSize,
      padding: '12px',
    }),
    groupHeading: (base) => ({
      ...base,
      color: 'var(--app-text-muted)',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '8px 12px 4px',
      margin: 0,
    }),
  };
}

export function ReactSelect<
  Option extends SelectOption = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ width, size = 'md', ...props }: ReactSelectWrapperProps<Option, IsMulti, Group>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    const s = sizeMap[size || 'md'];
    return (
      <div
        style={{
          height: s.controlHeight,
          borderRadius: 6,
          border: '1px solid var(--app-border)',
          backgroundColor: 'var(--app-surface)',
        }}
      />
    );
  }

  return (
    <ReactSelectAsync<Option, IsMulti, Group>
      {...props}
      styles={{
        ...baseStyles<Option, IsMulti, Group>(sizeMap[size || 'md']),
        container: (base) => ({
          ...base,
          width: width || '100%',
        }),
      }}
    />
  );
}
