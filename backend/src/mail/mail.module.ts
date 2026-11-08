import { Module } from '@nestjs/common';
import { EmailService } from '../auth/email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class MailModule {}
