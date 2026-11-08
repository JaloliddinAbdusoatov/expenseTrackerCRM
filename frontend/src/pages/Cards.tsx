import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Wifi } from 'lucide-react';

type DemoCard = {
  id: string;
  brand: 'VISA' | 'MASTERCARD';
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
  gradient: string;
};

const demoCards: DemoCard[] = [
  {
    id: 'visa-demo',
    brand: 'VISA',
    holder: 'TEST USER',
    number: '4111 1111 1111 1111',
    expiry: '12/30',
    cvv: '123',
    gradient: 'from-blue-600 via-indigo-500 to-violet-600',
  },
  {
    id: 'mastercard-demo',
    brand: 'MASTERCARD',
    holder: 'TEST USER',
    number: '5555 5555 5555 4444',
    expiry: '11/29',
    cvv: '456',
    gradient: 'from-zinc-900 via-neutral-800 to-slate-700',
  },
];

export default function CardsPage() {
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});

  function toggleFlip(cardId: string) {
    setFlippedCardIds((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 w-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Cards</h1>
            <p className="text-sm text-muted-foreground">
              Test mode: click a card to flip and view back-side details.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 justify-items-center lg:justify-items-start">
          {demoCards.map((cardItem, index) => {
            const isFlipped = Boolean(flippedCardIds[cardItem.id]);

            return (
              <div
                key={cardItem.id}
                className="w-full max-w-[340px] sm:max-w-[390px] md:max-w-md animate-hovering-card mx-auto lg:mx-0"
                style={{
                  perspective: '1200px',
                  animationDelay: `${index * 0.5}s`,
                  animationDuration: `${4.8 + index * 0.6}s`,
                }}
              >
                <button
                  type="button"
                  aria-label={`${cardItem.brand} card`}
                  onClick={() => toggleFlip(cardItem.id)}
                  className="w-full text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div
                    className="relative h-44 sm:h-52 md:h-56 w-full transition-transform duration-700"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    <Card
                      className={`absolute inset-0 overflow-hidden text-white border border-white/20 bg-gradient-to-br ${cardItem.gradient} shadow-[0_26px_60px_-24px_rgba(8,8,24,0.75)] backdrop-blur-sm`}
                      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/35 blur-3xl" />
                      <div className="pointer-events-none absolute right-[-38px] top-6 h-36 w-36 rounded-full bg-indigo-300/25 blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-16 left-20 h-44 w-44 rounded-full bg-blue-400/30 blur-3xl" />
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.02)_38%,rgba(255,255,255,0)_62%)]" />
                      <div className="h-full p-4 sm:p-6 relative z-10 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <span className="text-xs opacity-85">Test card number</span>
                          <div className="flex items-center gap-3">
                            <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-90 opacity-80" />
                            <div className="flex items-center">
                              <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white/90" />
                              <span className="-ml-2 h-4 w-4 sm:-ml-2.5 sm:h-5 sm:w-5 rounded-full bg-white/70" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 sm:space-y-5">
                          <p className="font-mono text-[22px] sm:text-[26px] md:text-[30px] leading-none tracking-[0.12em] sm:tracking-[0.15em] text-white/90">
                            {cardItem.number}
                          </p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[10px] opacity-75 mb-1">Name</p>
                              <p className="font-medium text-sm sm:text-base text-white/90">{cardItem.holder}</p>
                            </div>
                            <div>
                              <p className="text-[10px] opacity-75 mb-1">Exp. Date</p>
                              <p className="font-semibold text-2xl sm:text-3xl tracking-wide text-white/90">{cardItem.expiry}</p>
                            </div>
                            <div className="h-8 w-12 sm:h-10 sm:w-14 rounded-md border border-white/30 bg-white/10" />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card
                      className={`absolute inset-0 overflow-hidden text-white border border-white/20 bg-gradient-to-br ${cardItem.gradient} shadow-[0_26px_60px_-24px_rgba(8,8,24,0.75)] backdrop-blur-sm`}
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_44%,rgba(255,255,255,0)_66%)]" />
                      <div className="h-full py-4 sm:py-5 flex flex-col">
                        <div className="h-8 sm:h-10 bg-black/70 w-full" />
                        <div className="px-4 sm:px-6 mt-4 sm:mt-5">
                          <p className="text-[10px] uppercase opacity-80 mb-1">Security Code (CVV)</p>
                          <div className="h-8 sm:h-9 bg-white/90 text-slate-900 rounded-md px-3 flex items-center justify-end font-mono tracking-widest">
                            {cardItem.cvv}
                          </div>
                        </div>
                        <div className="px-4 sm:px-6 mt-4 sm:mt-6 text-[11px] sm:text-xs opacity-90 space-y-1">
                          <p>Demo only - not a real payment card.</p>
                          <p>Tap card again to return to front side.</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
