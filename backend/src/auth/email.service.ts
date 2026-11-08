import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPortRaw = this.configService.get<string>('EMAIL_PORT');
    const emailPort = emailPortRaw ? (parseInt(String(emailPortRaw), 10) || 587) : 587;
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const emailSecure = this.configService.get<string>('EMAIL_SECURE', 'false') === 'true';

    this.fromEmail = this.configService.get<string>('EMAIL_FROM', emailUser || 'noreply@expanse-tracker.com');

    if (emailHost && emailPortRaw && emailUser && emailPass) {
      try {
        // Remove spaces from password if it's an App Password (Gmail-style "xxxx xxxx xxxx xxxx")
        const cleanPassword = (emailPass || '').replace(/\s+/g, '') || (emailPass || '');
        
        this.transporter = nodemailer.createTransport({
          host: emailHost.trim(),
          port: emailPort,
          secure: emailSecure, // true for 465, false for other ports
          auth: {
            user: emailUser,
            pass: cleanPassword, // App passwords can have spaces, we remove them
          },
          tls: {
            // Don't fail on invalid certificates
            rejectUnauthorized: false,
          },
        });
        
        // Test connection asynchronously (don't block constructor)
        this.transporter.verify().then(() => {
          console.log('✅ Email service initialized with SMTP');
          console.log(`📧 SMTP configured: ${emailUser} via ${emailHost}:${emailPort}`);
        }).catch((error) => {
          console.warn('⚠️ SMTP connection test failed:', error.message);
          console.warn('⚠️ Email service will still attempt to send emails');
        });
      } catch (error) {
        console.warn('❌ Failed to initialize SMTP:', error);
        console.warn('⚠️ Email service will work in mock mode');
      }
    } else {
      const miss: string[] = [];
      if (!emailHost) miss.push('EMAIL_HOST');
      if (!emailPortRaw) miss.push('EMAIL_PORT');
      if (!emailUser) miss.push('EMAIL_USER');
      if (!emailPass) miss.push('EMAIL_PASS');
      console.log('⚠️ Email service not configured. Using mock mode. Missing:', miss.join(', ') || 'check .env');
      console.log('💡 Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env. Run backend from ExpanseTrackerBackend so .env is loaded.');
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    if (!this.transporter) {
      console.log(`\n📧 [MOCK EMAIL] Verification email would be sent to: ${to}`);
      console.log(`📧 [MOCK EMAIL] To enable real emails, set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env\n`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'Код верификации - EmotionFlow',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Добро пожаловать в EmotionFlow!</h2>
            <p style="color: #666; font-size: 16px;">Спасибо за регистрацию! Используйте код ниже для верификации вашего email:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #f4f4f4; border: 2px solid #6366f1; border-radius: 8px; padding: 20px; display: inline-block;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #6366f1; font-family: monospace;">
                  ${token}
                </div>
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Введите этот 6-значный код на странице верификации
            </p>
            
            <p style="color: #666; font-size: 14px;">
              ⏰ Код действителен в течение 24 часов.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Если вы не создавали аккаунт, просто проигнорируйте это письмо.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, code: string): Promise<void> {
    if (!this.transporter) {
      console.log(`\n📧 [MOCK EMAIL] Password reset email would be sent to: ${to}`);
      console.log(`📧 [MOCK EMAIL] Reset code (6 digits): ${code}`);
      console.log(`📧 [MOCK EMAIL] To enable real emails, set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env\n`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'Сброс пароля - EmotionFlow',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Сброс пароля</h2>
            <p style="color: #666; font-size: 16px;">Вы запросили сброс пароля. Используйте код ниже для подтверждения:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #f4f4f4; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; display: inline-block;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #dc2626; font-family: monospace;">
                  ${code}
                </div>
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Введите этот 6-значный код на странице сброса пароля
            </p>
            
            <p style="color: #666; font-size: 14px;">
              ⏰ Код действителен в течение 1 часа.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.
            </p>
          </div>
        `,
      });
      console.log(`✅ Password reset email sent to: ${to} with code: ${code}`);
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendBudgetWarningEmail(to: string, category: string, spending: number, limit: number, percentage: number): Promise<void> {
    if (!this.transporter) {
      console.log(`\n📧 [MOCK EMAIL] Budget warning email would be sent to: ${to}`);
      console.log(`📧 [MOCK EMAIL] Category: ${category}, Spending: $${spending.toFixed(2)}, Limit: $${limit.toFixed(2)}, Percentage: ${percentage.toFixed(1)}%`);
      console.log(`📧 [MOCK EMAIL] To enable real emails, set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env\n`);
      return;
    }

    const isExceeded = percentage >= 100;
    const subject = isExceeded 
      ? `⚠️ Бюджет превышен: ${category} - EmotionFlow`
      : `⚠️ Бюджет почти исчерпан: ${category} - EmotionFlow`;

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${isExceeded ? '#dc2626' : '#f59e0b'}; text-align: center;">
              ${isExceeded ? '🚨 Бюджет превышен!' : '⚠️ Предупреждение о бюджете'}
            </h2>
            
            <div style="background: ${isExceeded ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${isExceeded ? '#dc2626' : '#f59e0b'}; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #333; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
                Категория: ${category}
              </p>
              <p style="color: #666; font-size: 16px; margin: 5px 0;">
                Потрачено: <strong style="color: ${isExceeded ? '#dc2626' : '#f59e0b'}">$${spending.toFixed(2)}</strong> из <strong>$${limit.toFixed(2)}</strong>
              </p>
              <p style="color: #666; font-size: 16px; margin: 5px 0;">
                Использовано: <strong style="color: ${isExceeded ? '#dc2626' : '#f59e0b'}">${percentage.toFixed(1)}%</strong>
              </p>
              ${isExceeded ? (
                `<p style="color: #dc2626; font-size: 16px; font-weight: bold; margin: 10px 0 0 0;">
                  Превышение: $${(spending - limit).toFixed(2)}
                </p>`
              ) : (
                `<p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">
                  Осталось: $${(limit - spending).toFixed(2)}
                </p>`
              )}
            </div>
            
            ${isExceeded ? (
              `<p style="color: #dc2626; font-size: 16px; text-align: center; font-weight: bold;">
                Ваш бюджет превышен! Рекомендуем пересмотреть траты в этой категории.
              </p>`
            ) : (
              `<p style="color: #666; font-size: 16px; text-align: center;">
                Ваш бюджет почти исчерпан (${percentage.toFixed(1)}%). Будьте внимательны с тратами в этой категории.
              </p>`
            )}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Это автоматическое уведомление от EmotionFlow. Вы можете управлять бюджетами в настройках приложения.
            </p>
          </div>
        `,
      });
      console.log(`✅ Budget ${isExceeded ? 'exceeded' : 'warning'} email sent to: ${to} for category: ${category}`);
    } catch (error) {
      console.error(`❌ Failed to send budget ${isExceeded ? 'exceeded' : 'warning'} email:`, error);
      // Не бросаем ошибку, чтобы не прерывать добавление расхода
    }
  }

  async sendReportEmail(
    to: string,
    reportFiles: Array<{ format: string; filename: string; content: string }>,
    dateRange: string,
    language: 'ru' | 'en' | 'ja',
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error(
        'Email is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env to send reports by email.'
      );
    }

    const lang = {
      ru: {
        subject: `Финансовый отчет - ${dateRange}`,
        greeting: 'Ваш финансовый отчет готов!',
        body: 'Отчеты прикреплены к этому письму. Вы можете скачать их и использовать для анализа ваших финансов.',
      },
      en: {
        subject: `Financial Report - ${dateRange}`,
        greeting: 'Your financial report is ready!',
        body: 'Reports are attached to this email. You can download them and use them to analyze your finances.',
      },
      ja: {
        subject: `財務レポート - ${dateRange}`,
        greeting: '財務レポートの準備ができました！',
        body: 'レポートはこのメールに添付されています。ダウンロードして財務分析に使用できます。',
      },
    }[language];

    try {
      // Подготавливаем вложения (PDF, Excel, HTML — контент base64)
      const attachments = reportFiles.map(file => {
        let mimeType: string;
        const filename = file.filename;

        if (file.format === 'pdf') {
          mimeType = 'application/pdf';
        } else if (file.format === 'excel') {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
          mimeType = 'text/html; charset=utf-8';
        }

        // Декодируем base64 контент
        let content: Buffer;
        try {
          // Все контенты должны быть в base64 (HTML и CSV)
          content = Buffer.from(file.content, 'base64');
        } catch (e) {
          // Если не base64, используем как UTF-8 строку (fallback)
          console.warn(`Warning: Failed to decode base64 for ${filename}, using as UTF-8`);
          content = Buffer.from(file.content, 'utf-8');
        }

        return { filename, content, contentType: mimeType };
      });

      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: lang.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">${lang.greeting}</h2>
            <p style="color: #666; font-size: 16px;">${lang.body}</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">${language === 'ru' ? 'Прикрепленные файлы' : language === 'ja' ? '添付ファイル' : 'Attached Files'}:</h3>
              <ul style="list-style: none; padding: 0;">
                ${reportFiles.map(f => {
                  const displayFormat = f.format.toUpperCase();
                  return `
                    <li style="padding: 10px; margin: 5px 0; background: white; border-radius: 4px;">
                      <strong>${f.filename}</strong> (${displayFormat})
                    </li>
                  `;
                }).join('')}
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              ${language === 'ru' 
                ? 'Файлы прикреплены к этому письму. Скачайте их и откройте в подходящем приложении (PDF, Excel, браузер для HTML).' 
                : language === 'ja' 
                ? 'ファイルはこのメールに添付されています。ダウンロードして対応するアプリケーションで開いてください。' 
                : 'Files are attached to this email. Download and open them in the appropriate application (PDF, Excel, or browser for HTML).'}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              ${language === 'ru' ? 'Это автоматическое уведомление от EmotionFlow.' : language === 'ja' ? 'これはEmotionFlowからの自動通知です。' : 'This is an automatic notification from EmotionFlow.'}
            </p>
          </div>
        `,
        attachments: attachments,
      });
      console.log(`✅ Report email sent to: ${to} with ${reportFiles.length} file(s) as attachments`);
    } catch (error: any) {
      const smtpMsg = error?.response || '';
      const errMsg = error?.message || 'Failed to send report email.';
      console.error('❌ Failed to send report email:', errMsg, smtpMsg ? `| SMTP: ${smtpMsg}` : '');
      throw new Error(smtpMsg ? `${errMsg} — SMTP: ${smtpMsg}` : errMsg);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Answer to user's feedback; uses same SMTP as verification / reports. */
  async sendFeedbackReplyEmail(
    to: string,
    userDisplayName: string,
    originalFeedback: string,
    adminReply: string,
  ): Promise<void> {
    if (!this.transporter) {
      throw new BadRequestException(
        'SMTP is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS (and EMAIL_FROM) in .env.',
      );
    }

    const safeName = this.escapeHtml(userDisplayName || 'User');
    const safeOriginal = this.escapeHtml(originalFeedback).replace(/\n/g, '<br/>');
    const safeReply = this.escapeHtml(adminReply).replace(/\n/g, '<br/>');

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'EmotionFlow — reply to your feedback',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;">
            <h2 style="color: #4f46e5; margin-top: 0;">Hello, ${safeName}</h2>
            <p style="color: #555; font-size: 15px;">Thank you for your message. Here is our reply:</p>
            <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.5;">${safeReply}</p>
            </div>
            <p style="color: #666; font-size: 13px; margin-top: 24px;">Your original message:</p>
            <div style="background: #f9fafb; padding: 14px; border-radius: 6px; font-size: 14px; color: #555; line-height: 1.5;">
              ${safeOriginal}
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Sent from EmotionFlow. Please do not reply to this email if the mailbox is not monitored.
            </p>
          </div>
        `,
      });
      console.log(`✅ Feedback reply email sent to: ${to}`);
    } catch (error: any) {
      const smtpMsg = error?.response || '';
      const errMsg = error?.message || 'Failed to send email';
      console.error('❌ Failed to send feedback reply email:', errMsg, smtpMsg);
      throw new BadRequestException(smtpMsg ? `${errMsg} — ${smtpMsg}` : errMsg);
    }
  }
}
