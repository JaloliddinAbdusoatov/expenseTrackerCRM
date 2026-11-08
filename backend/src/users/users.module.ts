import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { AdminController } from './admin.controller';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), FeedbackModule],
  controllers: [AdminController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}

