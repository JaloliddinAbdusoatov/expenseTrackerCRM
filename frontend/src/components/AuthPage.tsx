import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Wallet, Sparkles, TrendingUp, Heart, ArrowLeft } from 'lucide-react';

type AuthStep = 'login' | 'register-email' | 'register-verify' | 'register-final' | 'forgot-password' | 'reset-password-verify' | 'reset-password-new';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { 
    login, 
    register, 
    verifyEmail, 
    registrationState, 
    saveRegistrationState,
    clearRegistrationState,
  } = useAuth();
  
  const [authStep, setAuthStep] = useState<AuthStep>(
    location.pathname === '/signup' ? 'register-email' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Restore registration state on mount
  useEffect(() => {
    // Check if user came from "forgot password" link in Settings
    const showForgotPassword = localStorage.getItem('show_forgot_password');
    if (showForgotPassword === 'true') {
      localStorage.removeItem('show_forgot_password');
      setAuthStep('forgot-password');
      return;
    }

    if (registrationState) {
      setEmail(registrationState.email);
      if (registrationState.emailVerified) {
        // Don't auto-advance to step 3, let user decide
        // They can continue registration or go back to login
        setAuthStep('register-final');
        setMessage(t('auth.emailAlreadyVerified'));
      } else {
        setAuthStep('register-verify');
        setMessage(t('auth.checkEmailForCode'));
      }
    }
  }, [registrationState]);

  useEffect(() => {
    if (!registrationState) {
      setAuthStep(location.pathname === '/signup' ? 'register-email' : 'login');
      setError('');
      setMessage('');
    }
  }, [location.pathname, registrationState]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    // Always clear registration state when trying to login
    // This allows user to start fresh
    clearRegistrationState();

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || t('auth.loginError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await authApi.requestEmailVerification(email);
      saveRegistrationState(email, false);
      setMessage(t('auth.checkEmailForCode'));
      setAuthStep('register-verify');
    } catch (error: any) {
      setError(error.message || t('auth.verificationError'));
      clearRegistrationState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate 6-digit code
    if (verificationToken.length !== 6 || !/^\d{6}$/.test(verificationToken)) {
      setError(t('auth.enter6DigitCode'));
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await verifyEmail(verificationToken, email);
      if (result.success) {
        const verifiedEmail = result.email || email;
        saveRegistrationState(verifiedEmail, true);
        setEmail(verifiedEmail);
        setMessage(t('auth.emailVerified'));
        setAuthStep('register-final');
        setVerificationToken('');
      } else {
        setError(result.error || t('auth.invalidCode'));
      }
    } catch (error: any) {
      setError(error.message || t('auth.invalidCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordMinLengthError'));
      return;
    }

    if (!registrationState || !registrationState.emailVerified) {
      setError(t('auth.emailMustBeVerified'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(email, password, username);
      if (!result.success) {
        // If account already exists, suggest to login instead
        if (result.error?.includes('уже зарегистрирован') || result.error?.includes('already registered')) {
          setError(result.error + ' ' + t('auth.backToLogin'));
        } else {
          setError(result.error || t('auth.registrationError'));
        }
      } else {
        // Registration successful, clear form
        setUsername('');
        setPassword('');
        setMessage(t('auth.registrationComplete'));
        // Clear registration state after successful registration
        clearRegistrationState();
      }
    } catch (error: any) {
      setError(error.message || t('auth.registrationError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await authApi.requestPasswordReset(email);
      setMessage(t('auth.checkEmailForCode'));
      setAuthStep('reset-password-verify');
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('User not found')) {
        setError(t('auth.userNotRegistered') || 'Пользователь с таким email не найден.');
      } else {
        setError(msg || t('auth.verificationError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate 6-digit code
    if (resetCode.length !== 6 || !/^\d{6}$/.test(resetCode)) {
      setError(t('auth.enter6DigitCode'));
      return;
    }
    
    setIsLoading(true);

    try {
      // Verify code on backend
      const result = await authApi.verifyResetCode(resetCode);
      if (result.success) {
        setMessage(t('auth.codeVerified'));
        setAuthStep('reset-password-new');
      } else {
        setError(t('auth.invalidCode'));
      }
    } catch (error: any) {
      setError(error.message || t('auth.invalidCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newPassword || newPassword.length < 6) {
      setError(t('auth.passwordMinLengthError'));
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(resetCode, newPassword);
      setMessage(t('auth.passwordChanged'));
      clearRegistrationState();
      setTimeout(() => {
        setAuthStep('login');
        setResetCode('');
        setNewPassword('');
        setPasswordConfirmation('');
        setMessage('');
        setEmail('');
      }, 2000);
    } catch (error: any) {
      setError(error.message || t('auth.invalidCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Heart, text: t('auth.feature1') },
    { icon: TrendingUp, text: t('auth.feature2') },
    { icon: Sparkles, text: t('auth.feature3') },
  ];

  const renderAuthForm = () => {
    if (authStep === 'login') {
      return (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.email')}
            </label>
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.password')}
            </label>
            <Input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.login')
            )}
          </Button>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => {
                clearRegistrationState();
                setAuthStep('register-email');
                setError('');
                setMessage('');
                setEmail('');
              }}
              className="text-primary hover:text-primary/80 transition-colors text-sm w-full text-center"
            >
              {t('auth.noAccount')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthStep('forgot-password');
                setError('');
              }}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm w-full text-center"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
        </form>
      );
    }

    if (authStep === 'register-email') {
      return (
        <form onSubmit={handleRequestEmailVerification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.email')}
            </label>
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm whitespace-pre-line">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.sendVerificationCode')
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              clearRegistrationState();
              setAuthStep('login');
              setError('');
              setMessage('');
              setEmail('');
              setVerificationToken('');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full justify-center mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin')}
          </button>
        </form>
      );
    }

    if (authStep === 'register-verify') {
      return (
        <form onSubmit={handleVerifyEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.verificationCode')}
            </label>
            <Input
              type="text"
              placeholder={t('auth.verificationCodePlaceholder')}
              value={verificationToken}
              onChange={(e) => {
                // Only allow numbers and limit to 6 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationToken(value);
              }}
              required
              maxLength={6}
              className="w-full text-center text-2xl font-mono tracking-widest"
              style={{ letterSpacing: '0.5em' }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('auth.checkEmail').replace('{email}', email)}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm whitespace-pre-line">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.confirm')
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setAuthStep('register-email');
              setVerificationToken('');
              setError('');
              setMessage('');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full justify-center mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.changeEmail')}
          </button>
        </form>
      );
    }

    if (authStep === 'register-final') {
      return (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.email')}
            </label>
            <Input
              type="email"
              value={email}
              disabled
              className="w-full bg-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.username')}
            </label>
            <Input
              type="text"
              placeholder={t('auth.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.password')}
            </label>
            <Input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('auth.passwordMinLength')}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm whitespace-pre-line">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.registerButton')
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              clearRegistrationState();
              setAuthStep('login');
              setError('');
              setMessage('');
              setEmail('');
              setUsername('');
              setPassword('');
              setVerificationToken('');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full justify-center mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin')}
          </button>
        </form>
      );
    }

    if (authStep === 'forgot-password') {
      return (
        <form onSubmit={handleRequestPasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.email')}
            </label>
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-2">
              <div>{error}</div>
              {error === (t('auth.userNotRegistered') || 'Пользователь с таким email не найден.') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('login');
                    setError('');
                    setMessage('');
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors"
                >
                  {t('auth.backToLogin')}
                </button>
              )}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm whitespace-pre-line">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.sendResetCode')
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              clearRegistrationState();
              setAuthStep('login');
              setError('');
              setMessage('');
              setEmail('');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full justify-center mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin')}
          </button>
        </form>
      );
    }

    if (authStep === 'reset-password-verify') {
      return (
        <form onSubmit={handleVerifyResetCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.verificationCode')}
            </label>
            <Input
              type="text"
              placeholder={t('auth.verificationCodePlaceholder')}
              value={resetCode}
              onChange={(e) => {
                // Only allow numbers and limit to 6 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setResetCode(value);
              }}
              required
              maxLength={6}
              className="w-full text-center text-2xl font-mono tracking-widest"
              style={{ letterSpacing: '0.5em' }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('auth.checkEmail').replace('{email}', email)}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm whitespace-pre-line">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.confirm')
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setAuthStep('forgot-password');
              setResetCode('');
              setError('');
              setMessage('');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full justify-center mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.changeEmail')}
          </button>
        </form>
      );
    }

    if (authStep === 'reset-password-new') {
      return (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.newPassword')}
            </label>
            <Input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('auth.passwordMinLength')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('auth.confirmPassword')}
            </label>
            <Input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm whitespace-pre-line">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.resetPasswordButton')
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setAuthStep('reset-password-verify');
              setNewPassword('');
              setPasswordConfirmation('');
              setError('');
              setMessage('');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full justify-center mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к коду
          </button>
        </form>
      );
    }

    return null;
  };

  const getTitle = () => {
    switch (authStep) {
      case 'login':
        return t('auth.welcomeTitle');
      case 'register-email':
        return t('auth.register');
      case 'register-verify':
        return t('auth.verificationCode');
      case 'register-final':
        return t('auth.register');
      case 'forgot-password':
        return t('auth.resetPasswordTitle');
      case 'reset-password-verify':
        return t('auth.verificationCode');
      case 'reset-password-new':
        return t('auth.enterNewPassword');
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (authStep) {
      case 'login':
        return t('auth.welcomeSubtitle');
      case 'register-email':
        return t('auth.checkEmailForCode');
      case 'register-verify':
        return t('auth.checkEmailForCode');
      case 'register-final':
        return t('auth.emailVerified');
      case 'forgot-password':
        return t('auth.checkEmailForCode');
      case 'reset-password-verify':
        return t('auth.enter6DigitCode');
      case 'reset-password-new':
        return t('auth.enterNewPassword');
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left side - Branding (gradient va nur faqat chap yarimda) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: '1s' }}
        />

        <div className="relative z-10 flex flex-col justify-center px-8 xl:px-16">
          <div className="flex items-center gap-3 mb-8 animate-fade-in">
            <div className="p-3 rounded-2xl bg-primary/10 glow-primary">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold gradient-text">EmotionFlow</h1>
          </div>
          
          <h2 className="text-3xl font-semibold text-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {t('auth.welcomeTitle')} 💰✨
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {t('auth.welcomeSubtitle')}
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="p-2 rounded-xl bg-secondary">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — orqada yengil nur: blur orqali shisha yaxshi seziladi */}
      <div className="relative w-full lg:w-1/2 min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 overflow-y-auto">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute top-[40%] left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/24 blur-3xl" />
          <div className="absolute bottom-[12%] right-[8%] h-52 w-52 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute top-[18%] right-[6%] h-36 w-36 rounded-full bg-primary/14 blur-2xl" />
        </div>
        <div className="hidden lg:block absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>
        <div className="relative z-10 w-full max-w-md animate-fade-in flex-1 flex flex-col justify-center py-4 sm:py-6">
          <div className="lg:hidden flex items-center justify-between mb-4 sm:mb-5 w-full">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Wallet className="w-8 h-8 sm:w-9 sm:h-9 text-primary" />
            </div>
            <LanguageSwitcher />
          </div>

          <div className="auth-card-glass p-6 sm:p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {getTitle()}
            </h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              {getDescription()}
            </p>

            {renderAuthForm()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
