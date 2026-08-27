'use client';

import * as React from 'react';
import { useId, useMemo, useState } from 'react';
import type { MoveModuleBytecode } from '@aptos-labs/ts-sdk';
import { useDebounce } from 'use-debounce';
import { Input } from '../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import useAccountModules from '@/hooks/useAccountModules';
import {
  parseEntryFunctionInput,
  type EntryFunctionInputState
} from '@/lib/entryFunctionInput';
import { EntryFunctionDisplayNames } from '@/lib/displayNames';

const MAX_SUGGESTIONS = 50;

/** How long to wait after the address changes before fetching its modules. */
const ADDRESS_DEBOUNCE_MS = 300;

/** Framework address — the most common source of entry functions; prefetched. */
const FRAMEWORK_ADDRESS = '0x1';

type SuggestionBadge = 'entry' | 'view' | 'public';

interface Suggestion {
  /** Stable list key. */
  key: string;
  /** Value written into the field when this row is picked. */
  insertValue: string;
  /** Primary monospace label (module or function name). */
  primary: string;
  /** Optional friendly label (e.g. a known entry-function display name). */
  secondary?: string;
  /** Whether the row can be selected. Non-entry functions are shown disabled. */
  selectable: boolean;
  /** Keep the popover open after selecting (module -> functions). */
  keepOpen: boolean;
  badge?: SuggestionBadge;
}

/** startsWith matches rank above plain includes matches, then alphabetical. */
function byRelevance(query: string) {
  const q = query.toLowerCase();
  return (a: string, b: string) => {
    const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts || a.localeCompare(b);
  };
}

function buildSuggestions(
  state: EntryFunctionInputState,
  modules: MoveModuleBytecode[] | undefined
): { items: Suggestion[]; truncated: boolean } {
  if (state.mode === 'idle' || !modules) return { items: [], truncated: false };

  if (state.mode === 'modules') {
    const q = state.query.toLowerCase();
    const names = modules
      .map((m) => m.abi?.name)
      .filter(
        (name): name is string => !!name && name.toLowerCase().includes(q)
      )
      .sort(byRelevance(state.query));

    const items = names.slice(0, MAX_SUGGESTIONS).map<Suggestion>((name) => ({
      key: name,
      insertValue: `${state.address}::${name}::`,
      primary: name,
      selectable: true,
      keepOpen: true
    }));

    return { items, truncated: names.length > items.length };
  }

  const moduleAbi = modules.find((m) => m.abi?.name === state.module)?.abi;
  if (!moduleAbi) return { items: [], truncated: false };

  const q = state.query.toLowerCase();
  const functions = moduleAbi.exposed_functions
    .filter((fn) => fn.name.toLowerCase().includes(q))
    // Selectable (entry) functions first, then by relevance.
    .sort((a, b) => {
      const entryDelta = Number(b.is_entry) - Number(a.is_entry);
      return entryDelta || byRelevance(state.query)(a.name, b.name);
    });

  const items = functions.slice(0, MAX_SUGGESTIONS).map<Suggestion>((fn) => {
    const insertValue = `${state.address}::${state.module}::${fn.name}`;
    const known =
      EntryFunctionDisplayNames[
        insertValue as keyof typeof EntryFunctionDisplayNames
      ];
    return {
      key: fn.name,
      insertValue,
      primary: fn.name,
      secondary: known,
      selectable: fn.is_entry,
      keepOpen: false,
      badge: fn.is_entry ? 'entry' : fn.is_view ? 'view' : 'public'
    };
  });

  return { items, truncated: functions.length > items.length };
}

export interface EntryFunctionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  ref?: React.Ref<HTMLInputElement>;
  'data-testid'?: string;
  // Injected by <FormControl> and forwarded to the underlying <input> so the
  // label's htmlFor, description, and validation ARIA keep working.
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: React.ComponentProps<'input'>['aria-invalid'];
}

/**
 * A text field that suggests an account's Move modules and their functions as
 * the user types `address::module::function`. Built on the Radix Popover
 * primitive (no combobox dependency) so the field keeps the plain Input look
 * and its react-hook-form binding; suggestions are additive and non-blocking.
 */
export default function EntryFunctionAutocomplete({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  ref,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'data-testid': dataTestId
}: EntryFunctionAutocompleteProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const state = useMemo(() => parseEntryFunctionInput(value), [value]);

  // Debounce the address that drives the fetch so typing an address char-by-char
  // doesn't fire a request per keystroke. Module/function filtering stays instant
  // because the address is stable once the user is past it.
  const [debouncedValue] = useDebounce(value, ADDRESS_DEBOUNCE_MS);
  const fetchAddress = useMemo(() => {
    const debounced = parseEntryFunctionInput(debouncedValue);
    return debounced.mode === 'idle' ? undefined : debounced.address;
  }, [debouncedValue]);

  // Warm the cache for the framework address so `0x1` suggestions are instant.
  useAccountModules({ address: FRAMEWORK_ADDRESS, enabled: !disabled });

  const modulesQuery = useAccountModules({
    address: fetchAddress,
    enabled: !disabled && !!fetchAddress
  });

  // Only surface modules once the debounced fetch matches the address the user
  // currently sees, so a stale list never shows under a newer address.
  const modulesForAddress =
    state.mode !== 'idle' && fetchAddress === state.address
      ? modulesQuery.data
      : undefined;

  const { items: suggestions, truncated } = useMemo(
    () => buildSuggestions(state, modulesForAddress),
    [state, modulesForAddress]
  );

  const isResolving =
    state.mode !== 'idle' &&
    (fetchAddress !== state.address || modulesQuery.isLoading);

  const selectableIndices = useMemo(
    () =>
      suggestions.reduce<number[]>((acc, s, i) => {
        if (s.selectable) acc.push(i);
        return acc;
      }, []),
    [suggestions]
  );

  // Keep the active row on a selectable item whenever the list changes.
  React.useEffect(() => {
    setActiveIndex(selectableIndices[0] ?? -1);
  }, [selectableIndices]);

  const openIfSuggestible = (next: string) => {
    setOpen(parseEntryFunctionInput(next).mode !== 'idle');
  };

  const handleChange = (next: string) => {
    onChange(next);
    openIfSuggestible(next);
  };

  const handleSelect = (suggestion: Suggestion) => {
    if (!suggestion.selectable) return;
    onChange(suggestion.insertValue);
    setOpen(suggestion.keepOpen);
  };

  const moveActive = (direction: 1 | -1) => {
    if (selectableIndices.length === 0) return;
    const pos = selectableIndices.indexOf(activeIndex);
    const nextPos =
      pos === -1
        ? direction === 1
          ? 0
          : selectableIndices.length - 1
        : (pos + direction + selectableIndices.length) %
          selectableIndices.length;
    setActiveIndex(selectableIndices[nextPos] ?? -1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (state.mode === 'idle') return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openIfSuggestible(value);
        else moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openIfSuggestible(value);
        else moveActive(-1);
        break;
      case 'Enter': {
        // Never let Enter submit the surrounding <form>.
        event.preventDefault();
        const active = open ? suggestions[activeIndex] : undefined;
        if (active) handleSelect(active);
        break;
      }
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={ref}
          id={id}
          type="text"
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => openIfSuggestible(value)}
          onBlur={() => {
            onBlur?.();
            // Suggestion clicks preventDefault mousedown, so they never blur the
            // input; a real blur (tab away, focus another field) closes the list.
            setOpen(false);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-activedescendant={
            open && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          data-testid={dataTestId}
        />
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={4}
        // Keep focus in the input and manage dismissal ourselves (blur / Escape /
        // selection) so an anchored, never-focused panel can't spuriously close.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div
          id={listboxId}
          role="listbox"
          // preventDefault keeps focus in the input when clicking a row, so the
          // click selects without blurring (which would close the list first).
          onMouseDown={(e) => e.preventDefault()}
          className="max-h-72 overflow-y-auto py-1"
        >
          {state.mode !== 'idle' && (
            <div className="text-muted-foreground px-3 pt-1 pb-1.5 text-xs font-medium break-all">
              {state.mode === 'modules' ? (
                <>
                  Modules in <span className="font-mono">{state.address}</span>
                </>
              ) : (
                <>
                  <span className="font-mono">{state.module}</span> functions
                </>
              )}
            </div>
          )}

          {isResolving ? (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              {state.mode === 'functions'
                ? 'Loading functions…'
                : 'Loading modules…'}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              {state.mode === 'functions'
                ? 'No matching functions'
                : 'No matching modules'}
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.key}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                aria-disabled={!suggestion.selectable}
                disabled={!suggestion.selectable}
                onMouseEnter={() =>
                  suggestion.selectable && setActiveIndex(index)
                }
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left',
                  suggestion.selectable
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-50',
                  index === activeIndex &&
                    suggestion.selectable &&
                    'bg-accent text-accent-foreground'
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-xs">
                    {suggestion.primary}
                  </span>
                  {suggestion.secondary && (
                    <span className="text-muted-foreground truncate text-xs">
                      {suggestion.secondary}
                    </span>
                  )}
                </span>
                {suggestion.badge && (
                  <Badge
                    variant={
                      suggestion.badge === 'entry' ? 'secondary' : 'outline'
                    }
                    className="text-[10px]"
                  >
                    {suggestion.badge}
                  </Badge>
                )}
              </button>
            ))
          )}

          {truncated && (
            <div className="text-muted-foreground px-3 py-1.5 text-xs">
              Showing the first {MAX_SUGGESTIONS} matches — keep typing to
              narrow them down.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
