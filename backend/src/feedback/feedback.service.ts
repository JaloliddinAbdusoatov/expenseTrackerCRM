import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFeedback } from './user-feedback.entity';
import { User } from '../users/user.entity';
import { toFeedbackItem } from './feedback.dto';
import { EmailService } from '../auth/email.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(UserFeedback)
    private readonly feedbackRepo: Repository<UserFeedback>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, message: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked');
    }
    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message is empty');
    }
    const row = this.feedbackRepo.create({ user, message: trimmed });
    const saved = await this.feedbackRepo.save(row);
    return this.findOneForAdmin(saved.id);
  }

  async findPaginatedForAdmin(page: number, limit: number, search?: string) {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 10));

    const qb = this.feedbackRepo
      .createQueryBuilder('fb')
      .leftJoinAndSelect('fb.user', 'user')
      .orderBy('fb.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);

    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      qb.andWhere(
        '(LOWER(fb.message) LIKE LOWER(:pattern) OR LOWER(user.username) LIKE LOWER(:pattern) OR LOWER(user.email) LIKE LOWER(:pattern))',
        { pattern },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map(toFeedbackItem),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async findOneForAdmin(id: string) {
    const row = await this.feedbackRepo.findOne({ where: { id }, relations: ['user'] });
    if (!row) {
      throw new NotFoundException('Feedback not found');
    }
    return toFeedbackItem(row);
  }

  async updateMessage(id: string, message: string) {
    const row = await this.feedbackRepo.findOne({ where: { id }, relations: ['user'] });
    if (!row) {
      throw new NotFoundException('Feedback not found');
    }
    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message is empty');
    }
    row.message = trimmed;
    await this.feedbackRepo.save(row);
    return this.findOneForAdmin(id);
  }

  async remove(id: string) {
    const res = await this.feedbackRepo.delete(id);
    if (!res.affected) {
      throw new NotFoundException('Feedback not found');
    }
    return { success: true };
  }

  async sendReplyByEmail(feedbackId: string, replyMessage: string) {
    const row = await this.feedbackRepo.findOne({ where: { id: feedbackId }, relations: ['user'] });
    if (!row) {
      throw new NotFoundException('Feedback not found');
    }
    const trimmed = replyMessage.trim();
    if (!trimmed) {
      throw new BadRequestException('Reply message is empty');
    }
    await this.emailService.sendFeedbackReplyEmail(
      row.user.email,
      row.user.username,
      row.message,
      trimmed,
    );
    return { success: true, sentTo: row.user.email };
  }
}
