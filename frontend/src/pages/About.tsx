import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Database,
  FileText,
  Languages,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/LanguageContext";

const AboutPage = () => {
  const { t } = useLanguage();
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY =
        window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      setShowFloatingNav(currentScrollY > 24);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [showFloatingNav]);

  const highlights = [
    {
      icon: Wallet,
      title: t("about.highlight1Title"),
      description: t("about.highlight1Desc"),
    },
    {
      icon: ShieldCheck,
      title: t("about.highlight2Title"),
      description: t("about.highlight2Desc"),
    },
    {
      icon: Zap,
      title: t("about.highlight3Title"),
      description: t("about.highlight3Desc"),
    },
  ];

  const problems = [
    t("about.problemItem1"),
    t("about.problemItem2"),
    t("about.problemItem3"),
  ];

  const solutions = [
    t("about.solutionItem1"),
    t("about.solutionItem2"),
    t("about.solutionItem3"),
  ];

  const features = [
    { icon: Bot, title: t("about.feature1Title"), description: t("about.feature1Desc") },
    { icon: BarChart3, title: t("about.feature2Title"), description: t("about.feature2Desc") },
    { icon: Target, title: t("about.feature3Title"), description: t("about.feature3Desc") },
    { icon: Trophy, title: t("about.feature4Title"), description: t("about.feature4Desc") },
    { icon: FileText, title: t("about.feature5Title"), description: t("about.feature5Desc") },
    { icon: Languages, title: t("about.feature6Title"), description: t("about.feature6Desc") },
  ];

  const stack = [
    t("about.stackItem1"),
    t("about.stackItem2"),
    t("about.stackItem3"),
    t("about.stackItem4"),
    t("about.stackItem5"),
  ];

  const roadmap = [
    t("about.roadmapItem1"),
    t("about.roadmapItem2"),
    t("about.roadmapItem3"),
    t("about.roadmapItem4"),
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        className={`fixed left-1/2 top-4 z-50 w-[min(96vw,2080px)] -translate-x-1/2 transition-transform duration-700 ease-out ${
          showFloatingNav
            ? "translate-y-0 scale-100 pointer-events-auto"
            : "-translate-y-24 scale-100 pointer-events-none"
        }`}
      >
        <nav
          className={`relative mx-auto flex h-14 items-center justify-between overflow-hidden rounded-full border px-3 transition-[border-color,box-shadow] duration-500 ease-out ${
            showFloatingNav
              ? "border-white/15 shadow-[0_10px_40px_-16px_rgba(0,0,0,0.8)]"
              : "border-transparent shadow-none"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 rounded-full transition-none ${
              showFloatingNav
                ? "bg-slate-950/78 about-floating-nav-dots backdrop-blur-2xl"
                : "bg-slate-950/0 backdrop-blur-0"
            }`}
          />

          <Link to="/" className="relative z-10 flex items-center gap-2.5 rounded-full px-3 py-1.5">
            <div className="rounded-xl border border-primary/30 bg-primary/15 p-1.5">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-white/95">EmotionFlow</span>
          </Link>

          <div className="relative z-10 flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher compact />
            </div>
            <Button asChild variant="ghost" className="hidden h-9 rounded-full text-white/90 hover:bg-white/10 hover:text-white md:inline-flex">
              <Link to="/auth">{t("auth.login")}</Link>
            </Button>
            <Button asChild variant="gradient" className="hidden h-9 rounded-full animated-cta-gradient md:inline-flex">
              <Link to="/signup">{t("about.signUp")}</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 rounded-full text-white/90 hover:bg-white/10 hover:text-white md:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            <div
              className={`absolute right-0 top-12 w-56 origin-top-right rounded-2xl border border-white/15 bg-slate-900/75 p-3 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-500 ease-out md:hidden ${
                mobileMenuOpen
                  ? "translate-y-0 scale-100 opacity-100 blur-0 pointer-events-auto"
                  : "-translate-y-2 scale-95 opacity-0 blur-[2px] pointer-events-none"
              }`}
            >
              <div className="mb-3">
                <LanguageSwitcher compact />
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild variant="ghost" className="h-9 justify-start rounded-xl bg-white/10 text-white hover:bg-white/15">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>{t("auth.login")}</Link>
                </Button>
                <Button asChild variant="gradient" className="h-9 justify-start rounded-xl animated-cta-gradient">
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>{t("about.signUp")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="pointer-events-none absolute -top-24 left-8 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse-slow" />
      <div
        className="pointer-events-none absolute -right-10 top-1/3 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-pulse-slow"
        style={{ animationDelay: "1.1s" }}
      />
      <div
        className="pointer-events-none absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl animate-float"
        style={{ animationDelay: "0.8s" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10 animate-page-enter">
        <header
          className={`flex items-center justify-between transition-all duration-700 ease-out ${
            showFloatingNav
              ? "opacity-0 -translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0 pointer-events-auto"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-2.5 glow-primary">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("about.productTag")}</p>
              <h1 className="text-xl font-semibold">EmotionFlow</h1>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher compact />
            </div>
            <Button asChild variant="ghost" className="hidden rounded-full md:inline-flex">
              <Link to="/auth">{t("auth.login")}</Link>
            </Button>
            <Button asChild variant="gradient" className="hidden rounded-full animated-cta-gradient md:inline-flex">
              <Link to="/signup">{t("about.signUp")}</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 rounded-full md:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            <div
              className={`absolute right-0 top-12 w-56 origin-top-right rounded-2xl border border-white/15 bg-slate-900/75 p-3 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-500 ease-out md:hidden ${
                mobileMenuOpen
                  ? "translate-y-0 scale-100 opacity-100 blur-0 pointer-events-auto"
                  : "-translate-y-2 scale-95 opacity-0 blur-[2px] pointer-events-none"
              }`}
            >
              <div className="mb-3">
                <LanguageSwitcher compact />
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild variant="ghost" className="h-9 justify-start rounded-xl bg-white/10 text-white hover:bg-white/15">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>{t("auth.login")}</Link>
                </Button>
                <Button asChild variant="gradient" className="h-9 justify-start rounded-xl animated-cta-gradient">
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>{t("about.signUp")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-start py-10 md:py-14">
          <div className="w-full space-y-8">
            <div className="space-y-5">
              <p className="about-badge-animated inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                {t("about.badge")}
              </p>
              <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl animate-slide-up">
                {t("about.heroTitlePrefix")}
                <span className="gradient-text gradient-text-animated"> {t("about.heroTitleAccent")}</span>
              </h2>
              <p
                className="max-w-2xl text-base text-muted-foreground md:text-lg animate-slide-up"
                style={{ animationDelay: "0.1s" }}
              >
                {t("about.heroDescription")}
              </p>
            </div>

            <div
              className="flex flex-wrap items-center gap-3 animate-slide-up"
              style={{ animationDelay: "0.15s" }}
            >
              <Button
                asChild
                size="lg"
                variant="gradient"
                className="w-full sm:w-auto max-w-full rounded-full animated-cta-gradient !whitespace-normal text-center leading-snug"
              >
                <Link to="/signup">
                  {t("about.startFree")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full">
                <Link to="/auth">{t("about.haveAccount")}</Link>
              </Button>
            </div>

            <div className="grid gap-4 pt-2 md:grid-cols-3">
              {highlights.map((item, index) => (
                <article
                  key={item.title}
                  className="glass-card rounded-2xl p-5 soft-shadow animate-slide-up"
                  style={{ animationDelay: `${0.22 + index * 0.08}s` }}
                >
                  <div className="mb-3 inline-flex rounded-xl bg-secondary p-2">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 pt-4 md:grid-cols-2">
              <article className="glass-card rounded-2xl p-6 soft-shadow">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  <Brain className="h-5 w-5 text-primary" />
                  {t("about.problemTitle")}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {problems.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="glass-card rounded-2xl p-6 soft-shadow">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  <Zap className="h-5 w-5 text-primary" />
                  {t("about.solutionTitle")}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {solutions.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="pt-2">
              <h3 className="mb-4 text-2xl font-semibold">{t("about.featuresTitle")}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {features.map((item) => (
                  <article key={item.title} className="glass-card rounded-2xl p-5 soft-shadow">
                    <div className="mb-3 inline-flex rounded-xl bg-secondary p-2">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-lg font-semibold">{item.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 pt-2 md:grid-cols-2">
              <article className="glass-card rounded-2xl p-6 soft-shadow">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  <Database className="h-5 w-5 text-primary" />
                  {t("about.stackTitle")}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {stack.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="glass-card rounded-2xl p-6 soft-shadow">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  <Target className="h-5 w-5 text-primary" />
                  {t("about.roadmapTitle")}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {roadmap.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>
            </div>

            <article className="glass-card rounded-2xl p-6 soft-shadow">
              <h3 className="mb-2 text-xl font-semibold">{t("about.impactTitle")}</h3>
              <p className="max-w-4xl text-sm text-muted-foreground">
                {t("about.impactDescription")}
              </p>
            </article>

          </div>
        </section>
      </div>
    </main>
  );
};

export default AboutPage;
