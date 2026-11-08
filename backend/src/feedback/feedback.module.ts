import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFeedback } from './user-feedback.entity';
import { User } from '../users/user.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserFeedback, User]), MailModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
