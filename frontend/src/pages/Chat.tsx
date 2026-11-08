import { ChatInterface } from '@/components/chat-interface';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ChatPage() {
  const { t } = useLanguage();
  return (
    <div className="flex-1 space-y-4 p-0 sm:p-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="px-4 pt-4 text-2xl sm:px-0 sm:pt-0 sm:text-3xl font-bold tracking-tight">{t('chat.title')}</h1>
      </div>
      <div className="h-[calc(100dvh-10rem)] sm:h-[calc(100vh-12rem)]">
        <ChatInterface />
      </div>
    </div>
  );
}
