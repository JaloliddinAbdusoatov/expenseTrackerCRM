import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfDay, endOfDay, subYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type DateRangeFilterProps = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<'preset' | 'custom'>('preset');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // preset ranges for quick filters
  const presetRanges = [
    { label: t('filter.lastMonth'), key: 'lastMonth', getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: t('filter.thisMonth'), key: 'thisMonth', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: t('filter.last7Days'), key: 'last7Days', getRange: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
    { label: t('filter.last30Days'), key: 'last30Days', getRange: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
    { label: t('filter.last3Months'), key: 'last3Months', getRange: () => ({ from: startOfMonth(subMonths(new Date(), 3)), to: endOfMonth(new Date()) }) },
    { label: t('filter.lastYear'), key: 'lastYear', getRange: () => ({ from: subYears(new Date(), 1), to: new Date() }) },
    { label: t('filter.allTime'), key: 'allTime', getRange: () => ({ from: new Date(0), to: endOfDay(new Date()) }) },
  ];

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    if (dateRange.from) {
      return format(dateRange.from, 'MMM d, yyyy');
    }
    return t('goals.selectDateRange');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[280px] justify-start text-left font-normal",
            !dateRange.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t('filter.quickFilters')}</div>
            <div className="grid grid-cols-2 gap-2">
              {presetRanges.map((preset) => (
                <Button
                  key={preset.key}
                  variant={activePreset === preset.key ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const range = preset.getRange();
                    onDateRangeChange({
                      from: startOfDay(range.from),
                      to: endOfDay(range.to),
                    });
                    setSelectionType('preset');
                    setActivePreset(preset.key);
                    // поповер не закрываем, чтобы можно было сразу скорректировать диапазон вручную
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">{t('filter.customRange')}</div>
              {selectionType === 'custom' && (
                <span className="text-xs text-muted-foreground">{t('filter.selectedManually')}</span>
              )}
            </div>
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (!range) {
                  onDateRangeChange({ from: undefined, to: undefined });
                  setSelectionType('custom');
                  setActivePreset(null);
                  return;
                }

                if (range.from && range.to) {
                  // Полный диапазон: любая стартовая и любая конечная дата
                  setSelectionType('custom');
                  setActivePreset(null);
                  onDateRangeChange({
                    from: startOfDay(range.from),
                    to: endOfDay(range.to),
                  });
                  // После выбора начала и конца удобно сразу закрыть поповер
                  setIsOpen(false);
                } else if (range.from) {
                  // Первый клик — только начало диапазона
                  setSelectionType('custom');
                  setActivePreset(null);
                  onDateRangeChange({
                    from: startOfDay(range.from),
                    to: undefined,
                  });
                }
              }}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
