import { useLanguage, Language } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

const languageNames: Record<Language, string> = {
  ru: 'Русский',
  en: 'English',
  ja: '日本語',
};

const languageShortNames: Record<Language, string> = {
  ru: 'RU',
  en: 'EN',
  ja: 'JP',
};

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const labels = compact ? languageShortNames : languageNames;

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <Languages className={cn("text-muted-foreground shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger
          className={cn(
            "border-border/90 bg-card/80 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_20px_rgba(0,0,0,0.22)] hover:border-border focus:ring-primary/25",
            compact ? "h-8 w-[74px] text-xs px-2.5" : "h-9 w-[100px] sm:w-[140px] text-sm",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ru">{labels.ru}</SelectItem>
          <SelectItem value="en">{labels.en}</SelectItem>
          <SelectItem value="ja">{labels.ja}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
