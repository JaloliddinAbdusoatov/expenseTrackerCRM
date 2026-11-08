import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, CheckCircle, XCircle, Upload, Globe2, Wallet, UserCog, ShieldCheck, Mail, KeyRound, TriangleAlert, MessageSquarePlus, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { authApi, expensesApi, feedbackApi } from '@/lib/api';
import { ImageCropper } from '@/components/image-cropper';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currencyOptions, type CurrencyCode } from '@/lib/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isIosBrowser, usePwaInstall } from '@/hooks/use-pwa-install';

export default function SettingsPage() {
  const { user, logout, verifyEmail, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  // Password change states (step-by-step)
  const [currentPassword, setCurrentPassword] = useState('');
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
  const [isVerifyingCurrentPassword, setIsVerifyingCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Username change states
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);

  // Email change states (step-by-step)
  const [currentEmail, setCurrentEmail] = useState('');
  const [isCurrentEmailVerified, setIsCurrentEmailVerified] = useState(false);
  const [isVerifyingCurrentEmail, setIsVerifyingCurrentEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isRequestingNewEmailVerification, setIsRequestingNewEmailVerification] = useState(false);
  const [newEmailVerificationToken, setNewEmailVerificationToken] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [pwaManualOpen, setPwaManualOpen] = useState(false);

  const { toast } = useToast();
  const pwa = usePwaInstall();
  const fieldClassName =
    'border-border bg-card/85 shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_8px_24px_rgba(0,0,0,0.22)] transition-all focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_1px_rgba(124,102,255,0.55),0_0_0_4px_rgba(124,102,255,0.18),0_12px_30px_rgba(124,102,255,0.22)]';
  const selectFieldClassName =
    'border-border bg-card/85 shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_8px_24px_rgba(0,0,0,0.22)] focus:ring-0';

  useEffect(() => {
    if (user) {
      setShowVerificationInput(!user.emailVerified);
      setSelectedCurrency((user.currency || 'USD') as CurrencyCode);
    }
  }, [user]);

  // Joriy emailni avtomatik to'ldirish (email o'zgartirish uchun)
  useEffect(() => {
    if (user?.email && currentEmail === '') {
      setCurrentEmail(user.email);
    }
  }, [user?.email, currentEmail]);

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  // Removed onSubmit - profile updates are now handled separately for username and email

  async function handleVerifyEmail() {
    if (!verificationToken.trim()) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.emailVerifyError'),
        variant: 'destructive',
      });
      return;
    }

    const result = await verifyEmail(verificationToken);
    if (result.success) {
      toast({
        title: t('settings.emailVerified'),
        description: t('settings.emailVerified'),
      });
      setShowVerificationInput(false);
      setVerificationToken('');
    } else {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: result.error || t('settings.emailVerifyErrorInvalid'),
        variant: 'destructive',
      });
    }
  }

  async function handleUpdateCurrency() {
    if (!user?.id) return;
    try {
      await authApi.updateCurrency(user.id, selectedCurrency);
      await refreshUser();
      toast({
        title: t('settings.profileUpdateSuccessTitle'),
        description: 'Currency updated successfully',
      });
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || 'Failed to update currency',
        variant: 'destructive',
      });
    }
  }

  async function handleSendFeedback() {
    if (!user?.id) return;
    const text = feedbackText.trim();
    if (text.length < 3) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.feedbackTooShort'),
        variant: 'destructive',
      });
      return;
    }
    setIsSendingFeedback(true);
    try {
      await feedbackApi.submit(user.id, text);
      setFeedbackText('');
      toast({
        title: t('settings.feedbackSuccessTitle'),
        description: t('settings.feedbackSuccessDescription'),
      });
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.feedbackError'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingFeedback(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.avatarErrorInvalidType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.avatarErrorTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL and open crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageToCrop(result);
        setCropDialogOpen(true);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  }

  async function handleCropComplete(croppedBlob: Blob) {
    if (!user?.id) return;

    try {
      setIsUploadingAvatar(true);
      
      // Convert blob to File
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      
      // Upload cropped photo
      const uploadResult = await expensesApi.uploadPhoto(croppedFile);
      
      // Store only relative avatar path in backend so it survives IP/domain changes
      const avatarPath = uploadResult.path.startsWith('/')
        ? uploadResult.path
        : `/${uploadResult.path}`;
      
      // Update profile - backend will handle deleting old photo
      await authApi.updateProfile(user.id, avatarPath);
      
      // Refresh user data
      await refreshUser();
      
      toast({
        title: t('settings.avatarSuccessTitle'),
        description: t('settings.avatarSuccessDescription'),
      });
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.avatarErrorUpload'),
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
      setImageToCrop(null);
    }
  }

  async function handleVerifyCurrentPassword() {
    if (!user?.id || !currentPassword) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.changePasswordErrorFillAll'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsVerifyingCurrentPassword(true);
      await authApi.verifyCurrentPassword(user.id, currentPassword);
      setIsCurrentPasswordVerified(true);
      toast({
        title: t('settings.changePasswordSuccessTitle'),
        description: t('settings.currentPasswordVerified') || 'Current password verified',
      });
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.changePasswordErrorDescription'),
        variant: 'destructive',
      });
      setIsCurrentPasswordVerified(false);
    } finally {
      setIsVerifyingCurrentPassword(false);
    }
  }

  async function handleChangePassword() {
    if (!user?.id) return;

    if (!isCurrentPasswordVerified) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.verifyCurrentPasswordFirst') || 'Please verify current password first',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || !passwordConfirmation) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.changePasswordErrorFillAll'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.changePasswordErrorMinLength'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== passwordConfirmation) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.changePasswordErrorMismatch'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await authApi.changePassword(user.id, currentPassword, newPassword);
      toast({
        title: t('settings.changePasswordSuccessTitle'),
        description: t('settings.changePasswordSuccessDescription'),
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');
      setIsCurrentPasswordVerified(false);
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.changePasswordErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleChangeUsername() {
    if (!user?.id || !newUsername || newUsername.trim() === '') {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.usernameRequired') || 'Please enter a username',
        variant: 'destructive',
      });
      return;
    }

    if (newUsername.length < 2) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.usernameMinLength') || 'Username must be at least 2 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChangingUsername(true);
      await authApi.updateUsername(user.id, newUsername.trim());
      toast({
        title: t('settings.profileUpdateSuccessTitle'),
        description: t('settings.usernameUpdated') || 'Username updated successfully',
      });
      setNewUsername('');
      await refreshUser();
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.changePasswordErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsChangingUsername(false);
    }
  }

  async function handleVerifyCurrentEmail() {
    if (!user?.id || !currentEmail) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.emailRequired') || 'Please enter your current email',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsVerifyingCurrentEmail(true);
      await authApi.verifyCurrentEmail(user.id, currentEmail);
      setIsCurrentEmailVerified(true);
      toast({
        title: t('settings.changePasswordSuccessTitle'),
        description: t('settings.currentEmailVerified') || 'Current email verified',
      });
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.changePasswordErrorDescription'),
        variant: 'destructive',
      });
      setIsCurrentEmailVerified(false);
    } finally {
      setIsVerifyingCurrentEmail(false);
    }
  }

  async function handleRequestNewEmailVerification() {
    if (!user?.id || !newEmail) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.emailRequired') || 'Please enter a new email',
        variant: 'destructive',
      });
      return;
    }

    if (!isCurrentEmailVerified) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.verifyCurrentEmailFirst') || 'Please verify current email first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsRequestingNewEmailVerification(true);
      await authApi.requestNewEmailVerification(user.id, newEmail);
      toast({
        title: t('settings.changePasswordSuccessTitle'),
        description: t('settings.verificationCodeSent') || 'Verification code sent to new email',
      });
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.changePasswordErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsRequestingNewEmailVerification(false);
    }
  }

  async function handleUpdateEmail() {
    if (!user?.id || !newEmailVerificationToken) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: t('settings.emailVerifyError'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdatingEmail(true);
      const res = await authApi.updateEmail(user.id, newEmailVerificationToken);
      if (res.email) localStorage.setItem('user_email', res.email);
      toast({
        title: t('settings.changePasswordSuccessTitle'),
        description: t('settings.emailUpdated') || 'Email updated successfully',
      });
      setCurrentEmail('');
      setNewEmail('');
      setNewEmailVerificationToken('');
      setIsCurrentEmailVerified(false);
      await refreshUser();
    } catch (error: any) {
      toast({
        title: t('settings.changePasswordErrorTitle'),
        description: error.message || t('settings.changePasswordErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  function getAvatarUrl() {
    if (!user?.avatarUrl) return undefined;
    
    // If avatarUrl is a full URL but points to our uploads folder with an old IP/domain,
    // normalize it to a relative path so it uses the current backend URL.
    let avatarPath = user.avatarUrl;
    const uploadsIndex = avatarPath.indexOf('/uploads/photos/');
    if (uploadsIndex !== -1) {
      avatarPath = avatarPath.substring(uploadsIndex);
    }

    // External avatars (gravatar, ui-avatars, etc.) should stay as-is
    if (uploadsIndex === -1 && avatarPath.startsWith('http')) {
      return avatarPath;
    }

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    return avatarPath.startsWith('/') 
      ? `${backendUrl}${avatarPath}` 
      : `${backendUrl}/${avatarPath}`;
  }

  return (
    <div className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden px-3 pt-2 pb-4 sm:p-6 md:p-8 max-md:pt-1">
      <div className="max-md:[&_button]:min-h-12 max-md:[&_button]:px-4 max-md:[&_button]:text-base space-y-4 md:space-y-6 min-w-0">
        <div className="rounded-2xl border bg-card/60 p-4 sm:p-5 backdrop-blur-sm max-md:py-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 md:mb-2">{t('settings.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserCog className="h-5 w-5 text-primary" />
                {t('settings.profileTitle')}
              </CardTitle>
              <CardDescription>{t('settings.profileDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!user?.emailVerified ? (
                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                      {t('settings.emailNotVerifiedTitle')}
                    </h3>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                    {t('settings.emailNotVerifiedDescription')}
                  </p>
                  {showVerificationInput && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder={t('settings.emailVerifyPlaceholder')}
                        value={verificationToken}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationToken(e.target.value)}
                        className={`flex-1 ${fieldClassName}`}
                      />
                      <Button
                        onClick={handleVerifyEmail}
                        size="sm"
                        className="border border-primary/40 bg-primary/90 shadow-[0_6px_18px_rgba(124,102,255,0.35)]"
                      >
                        {t('settings.emailVerifyButton')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-800 dark:text-green-200">{t('settings.emailVerified')}</span>
                </div>
              )}

              <div className="flex min-w-0 flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getAvatarUrl()} alt={user?.username || 'User'} />
                  <AvatarFallback className="text-2xl font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t('settings.avatarTitle')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    disabled={isUploadingAvatar}
                    className="border-border bg-card/85 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-card"
                  >
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingAvatar
                        ? t('settings.avatarButtonUploading')
                        : user?.avatarUrl
                          ? t('settings.avatarButtonChange')
                          : t('settings.avatarButtonUpload')}
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('settings.avatarNote')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('settings.usernameLabel')}</Label>
                <Input value={user?.username || ''} disabled className={fieldClassName} />
                <p className="text-xs text-muted-foreground">{t('settings.currentUsername') || 'Current username'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-username">{t('settings.newUsername') || 'New username'}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="new-username"
                    placeholder={t('settings.newUsername') || 'Enter new username'}
                    value={newUsername}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUsername(e.target.value)}
                    className={`flex-1 ${fieldClassName}`}
                  />
                  <Button
                    type="button"
                    onClick={handleChangeUsername}
                    disabled={isChangingUsername || !newUsername || newUsername.trim() === ''}
                    className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                  >
                    {isChangingUsername ? t('settings.changePasswordButtonLoading') : t('settings.changeUsername') || 'Change Username'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.usernameMinLength') || 'Username must be at least 2 characters'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe2 className="h-5 w-5 text-primary" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>{t('settings.selectLanguage')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border p-4">
                <LanguageSwitcher />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Currency
                </Label>
                <p className="text-sm text-muted-foreground">Choose how amounts are displayed across the app.</p>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as CurrencyCode)}>
                    <SelectTrigger className={`w-full min-w-0 sm:w-[240px] ${selectFieldClassName}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpdateCurrency}
                    disabled={!user || selectedCurrency === user.currency}
                    className="border-primary/35 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(124,102,255,0.25)] hover:bg-primary/18 disabled:opacity-80 disabled:border-border/80 disabled:bg-card/80"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Download className="h-5 w-5 text-primary" />
                {t('settings.pwaTitle')}
              </CardTitle>
              <CardDescription>{t('settings.pwaDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pwa.isStandalone ? (
                <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">{t('settings.pwaInstalledTitle')}</p>
                    <p className="text-sm text-green-800 dark:text-green-200">{t('settings.pwaInstalledDescription')}</p>
                  </div>
                </div>
              ) : (
                <>
                  {!pwa.canUseNativePrompt && (
                    <p className="text-sm text-muted-foreground">{t('settings.pwaManualDescription')}</p>
                  )}
                  <Button
                    type="button"
                    onClick={async () => {
                      if (pwa.canUseNativePrompt) {
                        const result = await pwa.triggerInstall();
                        if (result.outcome === 'accepted') {
                          toast({
                            title: t('settings.changePasswordSuccessTitle'),
                            description: t('settings.pwaSuccessDescription'),
                          });
                        }
                      } else {
                        setPwaManualOpen(true);
                      }
                    }}
                    className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('settings.pwaInstallButton')}
                  </Button>
                  <AlertDialog open={pwaManualOpen} onOpenChange={setPwaManualOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.pwaManualTitle')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-left text-foreground/90">
                          {isIosBrowser() ? t('settings.pwaIosHint') : t('settings.pwaGenericHint')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogAction>{t('settings.pwaManualOk')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Mail className="h-5 w-5 text-primary" />
              {t('settings.emailLabel')}
            </CardTitle>
            <CardDescription>{t('settings.emailDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.currentEmail') || 'Current email'}</Label>
              <Input value={user?.email || ''} disabled className={fieldClassName} />
            </div>

            {!isCurrentEmailVerified && (
              <div className="space-y-2">
                <Label htmlFor="current-email">{t('settings.currentEmail') || 'Current email'}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="current-email"
                    type="email"
                    placeholder={t('settings.currentEmail') || 'Enter current email'}
                    value={currentEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentEmail(e.target.value)}
                    className={`flex-1 ${fieldClassName}`}
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyCurrentEmail}
                    disabled={isVerifyingCurrentEmail || !currentEmail}
                    className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                  >
                    {isVerifyingCurrentEmail ? t('settings.changePasswordButtonLoading') : t('settings.verify') || 'Verify'}
                  </Button>
                </div>
              </div>
            )}

            {isCurrentEmailVerified && !newEmailVerificationToken && (
              <div className="space-y-2">
                <Label htmlFor="new-email">{t('settings.newEmail') || 'New email'}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="new-email"
                    type="email"
                    placeholder={t('settings.newEmail') || 'Enter new email'}
                    value={newEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
                    className={`flex-1 ${fieldClassName}`}
                  />
                  <Button
                    type="button"
                    onClick={handleRequestNewEmailVerification}
                    disabled={isRequestingNewEmailVerification || !newEmail}
                    className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                  >
                    {isRequestingNewEmailVerification ? t('settings.changePasswordButtonLoading') : t('settings.sendVerificationCode') || 'Send Code'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.verificationCodeWillBeSent') || 'Verification code will be sent to the new email'}</p>
              </div>
            )}

            {isCurrentEmailVerified && newEmail && (
              <div className="space-y-2">
                <Label htmlFor="new-email-verification-token">{t('settings.verificationCode') || 'Verification code'}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="new-email-verification-token"
                    placeholder={t('settings.emailVerifyPlaceholder')}
                    value={newEmailVerificationToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmailVerificationToken(e.target.value)}
                    className={`flex-1 ${fieldClassName}`}
                  />
                  <Button
                    type="button"
                    onClick={handleUpdateEmail}
                    disabled={isUpdatingEmail || !newEmailVerificationToken}
                    className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                  >
                    {isUpdatingEmail ? t('settings.changePasswordButtonLoading') : t('settings.updateEmail') || 'Update Email'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.checkEmailForCode') || 'Check your new email for the verification code'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('settings.changePasswordTitle')}
            </CardTitle>
            <CardDescription>{t('settings.changePasswordDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCurrentPasswordVerified && (
              <div className="space-y-2">
                <Label htmlFor="current-password" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  {t('settings.currentPassword')}
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                    className={`flex-1 ${fieldClassName}`}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter' && currentPassword) {
                        handleVerifyCurrentPassword();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyCurrentPassword}
                    disabled={isVerifyingCurrentPassword || !currentPassword}
                    className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                  >
                    {isVerifyingCurrentPassword ? t('settings.changePasswordButtonLoading') : t('settings.verify') || 'Verify'}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('show_forgot_password', 'true');
                    logout();
                  }}
                  className="text-xs text-primary hover:text-primary/80 mt-1 underline"
                >
                  {t('settings.forgotPassword')}
                </button>
              </div>
            )}

            {isCurrentPasswordVerified && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    className={fieldClassName}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.passwordMinLength')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-confirmation">{t('settings.passwordConfirmation')}</Label>
                  <Input
                    id="password-confirmation"
                    type="password"
                    placeholder="••••••••"
                    value={passwordConfirmation}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordConfirmation(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !passwordConfirmation}
                  className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)]"
                >
                  {isChangingPassword ? t('settings.changePasswordButtonLoading') : t('settings.changePasswordButton')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              {t('settings.feedbackTitle')}
            </CardTitle>
            <CardDescription>{t('settings.feedbackDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={t('settings.feedbackPlaceholder')}
              maxLength={4000}
              rows={4}
              className={`min-h-[100px] resize-y ${fieldClassName}`}
              disabled={isSendingFeedback}
            />
            <p className="text-xs text-muted-foreground">{t('settings.feedbackHint')}</p>
            <Button
              type="button"
              onClick={handleSendFeedback}
              disabled={isSendingFeedback || !feedbackText.trim()}
              className="border border-primary/35 bg-primary/85 shadow-[0_8px_22px_rgba(124,102,255,0.28)] w-full sm:w-auto"
            >
              {isSendingFeedback ? t('settings.feedbackSending') : t('settings.feedbackSubmit')}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t('settings.dangerZoneTitle')}
            </CardTitle>
            <CardDescription>{t('settings.dangerZoneDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto border border-destructive/40 shadow-[0_8px_22px_rgba(220,38,38,0.28)]">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('settings.logoutButton')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settings.logoutConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings.logoutConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('settings.logoutCancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('settings.logoutConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <footer className="rounded-2xl border border-border/60 bg-card/50 px-4 py-5 text-center text-sm text-muted-foreground backdrop-blur-sm">
          © 2026 emotionflow.uz. All rights reserved
        </footer>
      </div>

      {/* Image Cropper Dialog */}
      {imageToCrop && (
        <ImageCropper
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={imageToCrop}
          onCrop={handleCropComplete}
          aspectRatio={1}
        />
      )}
    </div>
  );
}
