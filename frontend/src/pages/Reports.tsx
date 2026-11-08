import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { FileDown, Loader2, CheckCircle2 } from 'lucide-react';
import { expensesApi } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getStoredReportDateFilter,
  setStoredReportDateFilter,
  rangeToPreset,
  presetToRange,
  type ReportDatePreset,
} from '@/lib/report-date-filter';
import { format as formatDate } from 'date-fns';

const REPORT_PRESETS: ReportDatePreset[] = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'];

export default function ReportsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [format, setFormat] = useState<'pdf' | 'excel' | 'html' | 'all'>('pdf');
  const [dateRange, setDateRange] = useState<string>(() => {
    const stored = getStoredReportDateFilter();
    if (stored) return rangeToPreset(stored.from, stored.to);
    return 'this_month';
  });
  const timelineLabel = useMemo(() => {
    const stored = getStoredReportDateFilter();
    if (!stored) return null;
    return `${formatDate(stored.from, 'MMM d')} – ${formatDate(stored.to, 'MMM d, yyyy')}`;
  }, [dateRange]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [sendToEmail, setSendToEmail] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<
    Array<{ format: string; filename: string; content?: string; downloadUrl?: string; mimeType?: string }>
  >([]);

  const handleGenerateReport = async () => {
    if (!user?.id) return;

    try {
      setIsGenerating(true);
      setGeneratedFiles([]);

      // Call generate report API directly
      const reportResponse = await expensesApi.generateReport(
        user.id,
        format,
        dateRange,
        includeCharts,
        sendToEmail,
        language as 'ru' | 'en' | 'ja',
      );

      if (reportResponse.files && reportResponse.files.length > 0) {
        setGeneratedFiles(reportResponse.files);
        toast({
          title: t('reports.success'),
          description: reportResponse.message || (sendToEmail ? t('reports.sentToEmail') : t('reports.readyToDownload')),
        });
      } else {
        toast({
          title: t('reports.success'),
          description: reportResponse.message || t('reports.readyToDownload'),
        });
      }
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast({
        title: t('reports.error'),
        description: error.message || t('reports.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (file: { format: string; filename: string; content?: string; downloadUrl?: string; mimeType?: string }) => {
    if (file.content) {
      // Download from base64 content
      // Определяем MIME тип и расширение файла
      let mimeType: string = file.mimeType || '';
      let filename = file.filename;
      
      if (!mimeType) {
        if (file.format === 'pdf') {
          mimeType = 'application/pdf';
          if (!filename.endsWith('.pdf')) {
            filename = filename.replace(/\.html?$/, '.pdf');
          }
        } else if (file.format === 'excel') {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          if (!filename.endsWith('.xlsx')) {
            filename = filename.replace(/\.csv$/, '.xlsx');
          }
        } else {
          mimeType = 'text/html;charset=utf-8';
          if (!filename.endsWith('.html')) {
            filename = filename.replace(/\.pdf$/, '.html');
          }
        }
      }
      
      try {
        // Декодируем base64
        const byteCharacters = atob(file.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        toast({
          title: t('reports.error'),
          description: 'Failed to download file. Please try again.',
          variant: 'destructive',
        });
      }
    } else if (file.downloadUrl) {
      // Fallback to URL download
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('reports.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.generateReport')}</CardTitle>
          <CardDescription>{t('reports.generateDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="format">{t('reports.format')}</Label>
            <Select value={format} onValueChange={(value: any) => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="all">{t('reports.allFormats')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">{t('reports.dateRange')}</Label>
            <Select
              value={dateRange}
              onValueChange={(value: ReportDatePreset) => {
                setDateRange(value);
                const { from, to } = presetToRange(value);
                setStoredReportDateFilter(from, to);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {t(`reports.dateRange.${preset}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {timelineLabel && (
              <p className="text-xs text-muted-foreground">
                {language === 'ru' ? 'Период таймлайна: ' : language === 'ja' ? 'タイムライン期間: ' : 'Timeline period: '}
                {timelineLabel}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCharts"
              checked={includeCharts}
              onCheckedChange={(checked) => setIncludeCharts(checked === true)}
            />
            <Label htmlFor="includeCharts" className="cursor-pointer">
              {t('reports.includeCharts')}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendToEmail"
              checked={sendToEmail}
              onCheckedChange={(checked) => setSendToEmail(checked === true)}
            />
            <Label htmlFor="sendToEmail" className="cursor-pointer">
              {t('reports.sendToEmail')}
            </Label>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('reports.generating')}
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                {t('reports.generate')}
              </>
            )}
          </Button>

          {generatedFiles.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">{t('reports.downloadFiles')}:</p>
              {generatedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{file.filename}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('reports.download')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
