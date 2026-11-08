import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizonal, Bot, User } from 'lucide-react';
import { handleChat } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_SESSION_KEY_PREFIX = 'chat_messages';

function stripMarkdownMarkers(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[*-]\s+/gm, '• ')
    .trim();
}

export function ChatInterface() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const sessionKey = `${CHAT_SESSION_KEY_PREFIX}:${user?.id || 'guest'}`;
  const [messages, setMessages] = useState<Message[]>(() => [{ role: 'assistant', content: t('chat.greeting') }]);
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(
            parsed.map((message) =>
              message.role === 'assistant'
                ? { ...message, content: stripMarkdownMarkers(message.content) }
                : message,
            ),
          );
          return;
        }
      }
    } catch {
      // Ignore parse/storage errors and fallback to greeting
    }

    setMessages([{ role: 'assistant', content: t('chat.greeting') }]);
  }, [sessionKey, language, t]);

  useEffect(() => {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(messages));
    } catch {
      // Ignore storage write errors
    }
  }, [messages, sessionKey]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsPending(true);
    
    try {
      if (!user?.id) {
        const errorMessage: Message = { role: 'assistant', content: t('chat.loginRequired') };
        setMessages((prev) => [...prev, errorMessage]);
        setInput('');
        return;
      }

      const response = await handleChat(input, user.id, language);
      const assistantMessage: Message = {
        role: 'assistant',
        content: stripMarkdownMarkers(response.response),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = { role: 'assistant', content: t('chat.error') };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsPending(false);
    }
    
    setInput('');
  };

  return (
    <div className="flex h-full flex-col rounded-none border-x-0 border-y bg-card text-card-foreground shadow-sm overflow-hidden sm:rounded-xl sm:border">
      <ScrollArea className="flex-1 p-4 sm:p-6" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[75%] rounded-lg p-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isPending && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[75%] rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"></span>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.2s]"></span>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.4s]"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your finances..."
            className="flex-1"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !input.trim()}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
