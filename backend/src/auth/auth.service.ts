import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcryptjs';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits: 100000-999999
}
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

const DEFAULT_SUPERADMIN_EMAIL = 'admin@emotionflow.local';
const DEFAULT_SUPERADMIN_USERNAME_BASE = 'superadmin';
const ALLOWED_CURRENCIES = ['USD', 'UZS', 'JPY', 'RUB'] as const;
type CurrencyCode = (typeof ALLOWED_CURRENCIES)[number];

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(EmailVerificationToken)
    private readonly emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async requestEmailVerification(dto: RequestEmailVerificationDto) {
    // Check if email is already registered
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Create or update verification token (without user since user doesn't exist yet)
    // We'll store email in a temporary token and link it to a user after registration
    const existingToken = await this.emailTokenRepo.findOne({
      where: { email: dto.email },
    });

    // Generate 6-digit verification code
    const token = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    if (existingToken) {
      existingToken.token = token;
      existingToken.expiresAt = expiresAt;
      existingToken.used = false;
      existingToken.email = dto.email;
      await this.emailTokenRepo.save(existingToken);
    } else {
      const newToken = this.emailTokenRepo.create({
        token,
        expiresAt,
        used: false,
        email: dto.email,
        user: null,
      });
      await this.emailTokenRepo.save(newToken);
    }

    // Send verification email
    await this.emailService.sendVerificationEmail(dto.email, token);

    return { success: true, token };
  }

  async register(dto: RegisterDto) {
    // Check if email is already registered
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Check if email was verified before registration
    const verificationToken = await this.emailTokenRepo.findOne({
      where: { email: dto.email, used: true },
      order: { expiresAt: 'DESC' },
    });

    if (!verificationToken) {
      throw new BadRequestException('Email must be verified before registration');
    }

    const usernameExists = await this.usersService.findByUsername(dto.username);
    if (usernameExists) {
      throw new BadRequestException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      emailVerified: true, // Already verified
      role: 'user',
      isBlocked: false,
      currency: 'UZS',
    });

    return { userId: user.id };
  }

  async login(dto: LoginDto) {
    await this.ensureSuperAdminAccount();

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // For simplicity returning user id; you can extend this to JWT if needed.
    return { userId: user.id, emailVerified: user.emailVerified };
  }

  private async ensureSuperAdminAccount() {
    const superAdminEmail =
      this.configService.get<string>('SUPERADMIN_EMAIL') || DEFAULT_SUPERADMIN_EMAIL;
    const superAdminPassword = this.configService.get<string>('SUPERADMIN_PASSWORD');
    const superAdminUsernameBase =
      this.configService.get<string>('SUPERADMIN_USERNAME_BASE') || DEFAULT_SUPERADMIN_USERNAME_BASE;

    if (!superAdminPassword) {
      console.warn('SUPERADMIN_PASSWORD is not configured. Superadmin bootstrap is skipped.');
      return;
    }

    const existingByEmail = await this.usersService.findByEmail(superAdminEmail);
    const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

    if (existingByEmail) {
      existingByEmail.passwordHash = superAdminHash;
      existingByEmail.emailVerified = true;
      existingByEmail.role = 'superadmin';
      existingByEmail.isBlocked = false;
      existingByEmail.currency = 'USD';
      await this.usersService.create(existingByEmail);
      return;
    }

    let username = superAdminUsernameBase;
    let suffix = 1;

    while (await this.usersService.findByUsername(username)) {
      username = `${superAdminUsernameBase}${suffix}`;
      suffix += 1;
    }

    await this.usersService.create({
      email: superAdminEmail,
      username,
      passwordHash: superAdminHash,
      emailVerified: true,
      role: 'superadmin',
      isBlocked: false,
      currency: 'USD',
    });
  }

  async updateCurrency(userId: string, currency: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!ALLOWED_CURRENCIES.includes(currency as CurrencyCode)) {
      throw new BadRequestException('Unsupported currency');
    }

    await this.usersService.updateCurrency(userId, currency as CurrencyCode);
    return this.getProfile(userId);
  }

  private async createEmailVerificationToken(user: User) {
    const token = this.emailTokenRepo.create({
      token: generateVerificationCode(), // 6-digit code
      user,
      email: user.email,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
    });
    return this.emailTokenRepo.save(token);
  }

  async verifyEmail(tokenStr: string) {
    console.log(`🔍 Verifying email token: ${tokenStr}`);
    
    const token = await this.emailTokenRepo.findOne({
      where: { token: tokenStr },
      relations: ['user'],
    });
    
    if (!token) {
      console.log(`❌ Token not found: ${tokenStr}`);
      throw new BadRequestException('Invalid or expired token');
    }
    
    if (token.used) {
      console.log(`❌ Token already used: ${tokenStr}`);
      throw new BadRequestException('This verification token has already been used');
    }
    
    if (token.expiresAt < new Date()) {
      console.log(`❌ Token expired: ${tokenStr}, expired at: ${token.expiresAt}`);
      throw new BadRequestException('This verification token has expired. Please request a new one.');
    }
    
    token.used = true;
    await this.emailTokenRepo.save(token);
    
    console.log(`✅ Email verified for: ${token.email}`);
    
    // If user exists, mark email as verified
    if (token.user) {
      token.user.emailVerified = true;
      await this.usersService.create(token.user);
    }
    // If no user (pre-registration verification), the token is marked as used
    // and will be checked during registration
    
    return { success: true, email: token.email };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Явно говорим фронту, что пользователя нет, чтобы показать красивое сообщение
      throw new BadRequestException('User not found');
    }

    // Generate 6-digit verification code (same as email verification)
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

    // Check if token already exists for this user
    const existingToken = await this.resetTokenRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (existingToken) {
      existingToken.token = resetCode;
      existingToken.expiresAt = expiresAt;
      existingToken.used = false;
      await this.resetTokenRepo.save(existingToken);
    } else {
      const resetToken = this.resetTokenRepo.create({
        token: resetCode,
        user,
        expiresAt,
      });
      await this.resetTokenRepo.save(resetToken);
    }

    // Send password reset email with code
    await this.emailService.sendPasswordResetEmail(user.email, resetCode);

    return { success: true };
  }

  async verifyResetCode(code: string) {
    const resetToken = await this.resetTokenRepo.findOne({
      where: { token: code },
      relations: ['user'],
    });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }
    return { success: true, email: resetToken.user.email };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Now token is a 6-digit code
    const resetToken = await this.resetTokenRepo.findOne({
      where: { token: dto.token },
      relations: ['user'],
    });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    resetToken.used = true;
    await this.resetTokenRepo.save(resetToken);

    const hash = await bcrypt.hash(dto.newPassword, 10);
    resetToken.user.passwordHash = hash;
    await this.usersService.create(resetToken.user);

    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash and update new password
    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    await this.usersService.create(user);

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, avatarUrl?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException();
    }
    
    if (avatarUrl !== undefined) {
      // Delete old avatar photo file if exists and is from our server
      const oldAvatarUrl = user.avatarUrl;
      console.log(`🔍 ===== updateProfile: Attempting to delete old avatar =====`);
      console.log(`🔍 oldAvatarUrl: ${oldAvatarUrl}`);
      console.log(`🔍 oldAvatarUrl type: ${typeof oldAvatarUrl}`);
      console.log(`🔍 oldAvatarUrl is truthy: ${!!oldAvatarUrl}`);
      if (oldAvatarUrl) {
        console.log(`🔍 oldAvatarUrl.includes('/uploads/photos/'): ${oldAvatarUrl.includes('/uploads/photos/')}`);
        console.log(`🔍 oldAvatarUrl.includes('uploads/photos/'): ${oldAvatarUrl.includes('uploads/photos/')}`);
      }
      
      // Check if old avatar is from our server (contains /uploads/photos/ or uploads/photos/)
      // Also check for full URLs like http://localhost:3000/uploads/photos/...
      const shouldDelete = oldAvatarUrl && (
        oldAvatarUrl.includes('/uploads/photos/') || 
        oldAvatarUrl.includes('uploads/photos/') ||
        oldAvatarUrl.includes('localhost:3000/uploads/photos/')
      );
      
      console.log(`🔍 shouldDelete: ${shouldDelete}`);
      
      if (shouldDelete) {
        console.log(`🔍 Condition passed! Proceeding with deletion...`);
        try {
          // Extract filename from old avatar URL
          let filename = '';
          
          // Try to extract filename using regex (works for both full URLs and relative paths)
          const match = oldAvatarUrl.match(/\/uploads\/photos\/([^\/\?]+)/);
          if (match && match[1]) {
            filename = match[1];
            console.log(`🔍 Extracted filename: ${filename}`);
          } else {
            // Fallback: try to get last part after last slash
            const parts = oldAvatarUrl.split('/');
            filename = parts[parts.length - 1];
            // Remove query parameters if any
            filename = filename.split('?')[0];
            console.log(`🔍 Extracted filename (fallback): ${filename}`);
          }
          
          // Only proceed if we have a valid filename (not external URL or placeholder)
          if (filename && filename.length > 0 && !filename.startsWith('http') && !filename.includes('://') && !filename.includes('ui-avatars.com') && filename.includes('.')) {
            const fullPath = join(process.cwd(), 'uploads', 'photos', filename);
            console.log(`🔍 Full path to delete: ${fullPath}`);
            console.log(`🔍 Current working directory: ${process.cwd()}`);
            console.log(`🔍 File exists: ${existsSync(fullPath)}`);
            
            if (existsSync(fullPath)) {
              unlinkSync(fullPath);
              console.log(`✅ Deleted old avatar photo file: ${fullPath}`);
            } else {
              console.warn(`⚠️ Avatar photo file not found: ${fullPath}`);
              // List files in directory for debugging
              try {
                const { readdirSync } = require('fs');
                const files = readdirSync(join(process.cwd(), 'uploads', 'photos'));
                console.log(`📁 Files in uploads/photos: ${files.join(', ')}`);
              } catch (e) {
                console.error('Could not list files:', e);
              }
            }
          } else {
            console.warn(`⚠️ Skipping deletion - invalid filename: ${filename}`);
          }
        } catch (error) {
          console.error('❌ Error deleting old avatar photo file:', error);
          // Continue with update even if photo deletion fails
        }
      } else {
        console.log(`ℹ️ Old avatar URL doesn't contain /uploads/photos/, skipping deletion`);
      }
      
      await this.usersService.updateAvatar(userId, avatarUrl);
    }
    
    return this.getProfile(userId);
  }

  async verifyCurrentPassword(userId: string, password: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return { success: true };
  }

  async updateUsername(userId: string, newUsername: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if username is already taken by another user
    const existingUser = await this.usersService.findByUsername(newUsername);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Username already taken');
    }

    user.username = newUsername;
    await this.usersService.create(user);

    return { success: true };
  }

  async verifyCurrentEmail(userId: string, email: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== email) {
      throw new UnauthorizedException('Current email is incorrect');
    }

    return { success: true };
  }

  async requestNewEmailVerification(userId: string, newEmail: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new email is already registered by another user
    const existingUser = await this.usersService.findByEmail(newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Email already registered');
    }

    // Create verification token for new email
    const existingToken = await this.emailTokenRepo.findOne({
      where: { email: newEmail },
    });

    const token = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    if (existingToken) {
      existingToken.token = token;
      existingToken.expiresAt = expiresAt;
      existingToken.used = false;
      existingToken.email = newEmail;
      existingToken.user = user;
      await this.emailTokenRepo.save(existingToken);
    } else {
      const newToken = this.emailTokenRepo.create({
        token,
        expiresAt,
        used: false,
        email: newEmail,
        user: user,
      });
      await this.emailTokenRepo.save(newToken);
    }

    // Send verification email to new address
    await this.emailService.sendVerificationEmail(newEmail, token);

    return { success: true, token };
  }

  async updateEmail(userId: string, verificationToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find verification token
    const token = await this.emailTokenRepo.findOne({
      where: { token: verificationToken, user: { id: userId } },
      relations: ['user'],
    });

    if (!token) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (token.used) {
      throw new BadRequestException('This verification token has already been used');
    }

    if (token.expiresAt < new Date()) {
      throw new BadRequestException('This verification token has expired. Please request a new one.');
    }

    // Update user email
    if (!token.email) {
      throw new BadRequestException('Token email is missing');
    }
    await this.usersService.updateEmail(userId, token.email);

    // Mark token as used
    token.used = true;
    await this.emailTokenRepo.save(token);

    return { success: true, email: token.email };
  }
}

