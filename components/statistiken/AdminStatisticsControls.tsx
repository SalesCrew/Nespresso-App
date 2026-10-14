"use client";

import { useId, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Match Team / Einsatzplan controls without changing the shared app primitives.
export const adminControlClass = 'h-9 rounded-lg border-gray-200 bg-white text-sm font-normal text-gray-600 [font-family:inherit] transition-colors hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gray-500 focus-visible:ring-offset-0';
export const adminScrollClass = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
export const adminTabClass = 'gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-600 shadow-none hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gray-500 focus-visible:ring-offset-0 data-[state=active]:border-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-sm';

export function AdminStatisticsButton({ primary = false, className, style, ...props }: ComponentProps<typeof Button> & { primary?: boolean }) {
  return <Button type="button" variant="outline" {...props}
    className={cn(adminControlClass, 'px-3 disabled:opacity-50', primary && 'border-transparent text-white hover:text-white hover:opacity-90 focus-visible:ring-white/80', className)}
    style={{ ...(primary ? { background: 'linear-gradient(135deg, #22C55E, #105F2D)' } : {}), ...style }} />;
}

export function AdminStatisticsInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(adminControlClass, 'w-full px-3 hover:bg-white', className)} />;
}

export type AdminStatisticsOption = { value: string; label: string; icon?: ReactNode; color?: string; disabled?: boolean };
type PickerProps = {
  label: string; value: string; onChange: (value: string) => void; options: AdminStatisticsOption[];
  placeholder?: string; disabled?: boolean; className?: string; style?: CSSProperties; id?: string;
  open?: boolean; onOpenChange?: (open: boolean) => void;
};
const emptyValue = '__statistics_unassigned__';
const panelClass = 'rounded-lg border-gray-200 bg-white text-gray-600 shadow-lg [font-family:inherit]';

export function AdminStatisticsSelect({ label, value, onChange, options, placeholder, disabled, className, style, id, open, onOpenChange }: PickerProps) {
  return <Select value={value || ''} disabled={disabled} open={open} onOpenChange={onOpenChange}
    onValueChange={next => onChange(next === emptyValue ? '' : next)}>
    <SelectTrigger id={id} aria-label={label} style={style}
      className={cn(adminControlClass, 'gap-2 focus:ring-1 focus:ring-inset focus:ring-gray-500 focus:ring-offset-0 [&>span]:flex [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-2', className)}>
      <SelectValue placeholder={placeholder || label} />
    </SelectTrigger>
    <SelectContent position="popper" collisionPadding={16} className={cn(panelClass, 'max-h-[min(20rem,var(--radix-select-content-available-height))] max-w-[calc(100vw-2rem)]')}>
      {options.map(option => <SelectItem key={option.value || emptyValue} value={option.value || emptyValue}
        textValue={option.label} disabled={option.disabled}
        style={option.color ? { '--option-hover': option.color } as CSSProperties : undefined}
        className={cn('cursor-pointer rounded-md py-2 text-gray-600 focus:bg-gray-50 focus:text-gray-900', option.color && 'focus:bg-[var(--option-hover)]')}>
        <span className="flex items-center gap-2 whitespace-normal">{option.icon}{option.label}</span>
      </SelectItem>)}
    </SelectContent>
  </Select>;
}

export function AdminStatisticsCombobox({ label, value, onChange, options, placeholder, disabled, className, style, id, open: controlledOpen, onOpenChange, marker }: PickerProps & { marker?: ReactNode }) {
  const [localOpen, setLocalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const listId = useId();
  const open = controlledOpen ?? localOpen;
  const changeOpen = (next: boolean) => {
    if (next && disabled) return;
    if (next) setSearch('');
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  const selected = options.find(option => option.value === value);
  return <Popover open={open && !disabled} onOpenChange={changeOpen}>
    <PopoverTrigger asChild>
      <AdminStatisticsButton id={id} role="combobox" aria-label={label} aria-expanded={open && !disabled}
        aria-controls={listId} disabled={disabled} style={style} title={selected?.label}
        className={cn('w-full justify-between gap-2', className)}>
        {marker}<span className="min-w-0 flex-1 truncate text-left">{selected?.label || placeholder || label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </AdminStatisticsButton>
    </PopoverTrigger>
    <PopoverContent align="start" collisionPadding={16} className={cn(panelClass, 'w-[var(--radix-popover-trigger-width)] min-w-[min(16rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden p-0')}>
      <Command className="rounded-lg [font-family:inherit]">
        <CommandInput aria-label={`${label} suchen`} placeholder="Suchen…" value={search} onValueChange={setSearch}
          className="h-10 text-sm [font-family:inherit]" />
        <CommandList id={listId} className={cn('max-h-[min(18rem,var(--radix-popover-content-available-height))]', adminScrollClass)}>
          <CommandEmpty className="px-3 py-4 text-sm text-gray-500">Keine Treffer.</CommandEmpty>
          <CommandGroup>
            {options.map(option => <CommandItem key={option.value || emptyValue} value={option.value || emptyValue}
              keywords={[option.label]} disabled={disabled || option.disabled}
              className="cursor-pointer rounded-md px-2 py-2 text-gray-600 data-[selected=true]:bg-gray-50 data-[selected=true]:text-gray-900"
              onSelect={() => { onChange(option.value); changeOpen(false); }}>
              <Check className={cn('h-4 w-4 shrink-0 text-green-700', value !== option.value && 'invisible')} />
              <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}

const monthLabels = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('de-AT', { month: 'short' }).format(new Date(2026, month, 1)));
const formatMonth = (year: number, month: number) => {
  const date = new Date(0);
  date.setFullYear(year, month, 1);
  return new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric' }).format(date);
};

export function AdminStatisticsMonthPicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const monthButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedYear = Number(value.slice(0, 4));
  const selectedMonth = Number(value.slice(5, 7)) - 1;
  const display = formatMonth(selectedYear, selectedMonth);
  const years = Array.from({ length: Math.min(9999, year + 10) - Math.max(1, year - 10) + 1 }, (_, index) => {
    const next = Math.max(1, year - 10) + index; return { value: String(next), label: String(next) };
  });
  return <Popover open={open && !disabled} onOpenChange={next => { setYear(selectedYear); setOpen(next); }}>
    <PopoverTrigger asChild>
      <AdminStatisticsButton disabled={disabled} aria-label={`Monat: ${display}`} className="min-w-44 justify-between">
        <span>{display}</span><CalendarDays className="h-4 w-4 text-gray-400" />
      </AdminStatisticsButton>
    </PopoverTrigger>
    <PopoverContent aria-label="Berichtsmonat auswählen" align="end" collisionPadding={16} className={cn(panelClass, 'w-72 max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-2rem)] overflow-y-auto p-3', adminScrollClass)}
      onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => monthButtons.current[selectedMonth]?.focus()); }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <AdminStatisticsButton aria-label="Vorheriges Jahr" disabled={year <= 1} className="w-9 px-0" onClick={() => setYear(year - 1)}><ChevronLeft /></AdminStatisticsButton>
        <AdminStatisticsSelect label="Jahr" value={String(year)} onChange={next => setYear(Number(next))} options={years} className="w-28" />
        <AdminStatisticsButton aria-label="Nächstes Jahr" disabled={year >= 9999} className="w-9 px-0" onClick={() => setYear(year + 1)}><ChevronRight /></AdminStatisticsButton>
      </div>
      <div role="group" aria-label="Monat auswählen" className="grid grid-cols-3 gap-2">
        {monthLabels.map((label, month) => <AdminStatisticsButton key={month} ref={node => { monthButtons.current[month] = node; }}
          aria-label={formatMonth(year, month)}
          aria-pressed={year === selectedYear && month === selectedMonth}
          className={cn('px-2', year === selectedYear && month === selectedMonth && 'border-gray-300 bg-gray-100 text-gray-900 shadow-sm')}
          onKeyDown={event => {
            const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
            const offset = offsets[event.key];
            if (offset !== undefined || event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              const next = event.key === 'Home' ? Math.floor(month / 3) * 3 : event.key === 'End' ? Math.floor(month / 3) * 3 + 2 : (month + (offset || 0) + 12) % 12;
              monthButtons.current[next]?.focus();
            }
          }}
          onClick={() => { const next = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`; if (next !== value) onChange(next); setOpen(false); }}>
          {label}
        </AdminStatisticsButton>)}
      </div>
    </PopoverContent>
  </Popover>;
}
