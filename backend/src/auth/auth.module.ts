import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule,
    UsersModule,
    TypeOrmModule.forFeature([EmailVerificationToken, PasswordResetToken]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, MailModule],
})
export class AuthModule {}

