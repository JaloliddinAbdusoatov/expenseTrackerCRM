import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-email-verification')
  requestEmailVerification(@Body() dto: RequestEmailVerificationDto) {
    return this.authService.requestEmailVerification(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() body: { code: string }) {
    return this.authService.verifyResetCode(body.code);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Put('profile/:userId')
  updateProfile(@Param('userId') userId: string, @Body() body: { avatarUrl?: string }) {
    return this.authService.updateProfile(userId, body.avatarUrl);
  }

  @Post('change-password/:userId')
  changePassword(@Param('userId') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Post('verify-current-password/:userId')
  verifyCurrentPassword(@Param('userId') userId: string, @Body() body: { password: string }) {
    return this.authService.verifyCurrentPassword(userId, body.password);
  }

  @Put('username/:userId')
  updateUsername(@Param('userId') userId: string, @Body() body: { username: string }) {
    return this.authService.updateUsername(userId, body.username);
  }

  @Post('verify-current-email/:userId')
  verifyCurrentEmail(@Param('userId') userId: string, @Body() body: { email: string }) {
    return this.authService.verifyCurrentEmail(userId, body.email);
  }

  @Post('request-new-email-verification/:userId')
  requestNewEmailVerification(@Param('userId') userId: string, @Body() body: { newEmail: string }) {
    return this.authService.requestNewEmailVerification(userId, body.newEmail);
  }

  @Post('update-email/:userId')
  updateEmail(@Param('userId') userId: string, @Body() body: { verificationToken: string }) {
    return this.authService.updateEmail(userId, body.verificationToken);
  }

  @Put('currency/:userId')
  updateCurrency(@Param('userId') userId: string, @Body() body: { currency: string }) {
    return this.authService.updateCurrency(userId, body.currency);
  }
}

