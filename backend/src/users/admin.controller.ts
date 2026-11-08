import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcryptjs';
import { FeedbackService } from '../feedback/feedback.service';
import { AdminCreateFeedbackDto } from '../feedback/dto/admin-create-feedback.dto';
import { AdminUpdateFeedbackDto } from '../feedback/dto/admin-update-feedback.dto';
import { AdminSendFeedbackReplyDto } from '../feedback/dto/admin-send-feedback-reply.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly feedbackService: FeedbackService,
  ) {}

  private async assertAdmin(adminUserId: string) {
    if (!adminUserId) {
      throw new UnauthorizedException('Admin access required');
    }

    const admin = await this.usersService.findById(adminUserId);
    if (
      !admin ||
      !['superadmin', 'admin', 'viewer_admin'].includes(admin.role) ||
      admin.isBlocked
    ) {
      throw new UnauthorizedException('Admin access required');
    }

    return admin;
  }

  private async assertAdminEditor(adminUserId: string) {
    const admin = await this.assertAdmin(adminUserId);
    if (admin.role === 'viewer_admin') {
      throw new UnauthorizedException('Viewer admin has read-only access');
    }
    return admin;
  }

  private async assertSuperAdmin(adminUserId: string) {
    const admin = await this.assertAdmin(adminUserId);
    if (admin.role !== 'superadmin') {
      throw new UnauthorizedException('Superadmin access required');
    }
    return admin;
  }

  @Get('stats')
  async getStats(@Query('adminUserId') adminUserId: string) {
    await this.assertAdmin(adminUserId);

    const [totalUsers, admins, blockedUsers] = await Promise.all([
      this.usersService.countAllUsers(),
      Promise.all([
        this.usersService.countByRole('superadmin'),
        this.usersService.countByRole('admin'),
        this.usersService.countByRole('viewer_admin'),
      ]).then(([superadmins, admins, viewers]) => superadmins + admins + viewers),
      this.usersService.countBlockedUsers(),
    ]);

    return {
      totalUsers,
      activeUsers: Math.max(0, totalUsers - blockedUsers),
      blockedUsers,
      adminsOnline: admins,
    };
  }

  @Get('users')
  async getUsers(
    @Query('adminUserId') adminUserId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.assertAdmin(adminUserId);
    return this.usersService.findAllForAdminPaginated(
      search || '',
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Post('users/:userId/block')
  async setBlocked(
    @Param('userId') userId: string,
    @Body() body: { adminUserId: string; isBlocked: boolean },
  ) {
    const actingAdmin = await this.assertAdminEditor(body?.adminUserId);

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    if (targetUser.id === actingAdmin.id) {
      throw new BadRequestException('Cannot block your own account');
    }

    if (targetUser.role === 'superadmin') {
      throw new BadRequestException('Cannot block superadmin account');
    }

    // Only superadmin can block admin-level accounts.
    if (targetUser.role !== 'user' && actingAdmin.role !== 'superadmin') {
      throw new BadRequestException('Only superadmin can block admin accounts');
    }

    const updated = await this.usersService.setBlocked(userId, !!body.isBlocked);
    return {
      success: true,
      user: updated,
    };
  }

  @Post('users')
  async createUser(
    @Body()
    body: {
      adminUserId: string;
      email: string;
      username: string;
      password: string;
      role?: 'user' | 'admin' | 'viewer_admin';
    },
  ) {
    const actingAdmin = await this.assertAdminEditor(body?.adminUserId);

    if (!body?.email || !body?.username || !body?.password) {
      throw new BadRequestException('Email, username and password are required');
    }

    const byEmail = await this.usersService.findByEmail(body.email);
    if (byEmail) {
      throw new BadRequestException('Email already registered');
    }

    const byUsername = await this.usersService.findByUsername(body.username);
    if (byUsername) {
      throw new BadRequestException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const requestedRole = body.role || 'user';
    if (requestedRole !== 'user') {
      await this.assertSuperAdmin(actingAdmin.id);
    }

    const created = await this.usersService.create({
      email: body.email,
      username: body.username,
      passwordHash,
      emailVerified: true,
      role: requestedRole === 'admin' ? 'admin' : requestedRole === 'viewer_admin' ? 'viewer_admin' : 'user',
      isBlocked: false,
    });

    return {
      success: true,
      user: {
        id: created.id,
        email: created.email,
        username: created.username,
        role: created.role,
      },
    };
  }

  @Delete('users/:userId')
  async deleteUser(
    @Param('userId') userId: string,
    @Query('adminUserId') adminUserId: string,
  ) {
    const actingAdmin = await this.assertAdminEditor(adminUserId);

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    if (targetUser.id === actingAdmin.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    if (targetUser.role === 'superadmin') {
      throw new BadRequestException('Cannot delete superadmin account');
    }

    // Only superadmin can delete admin-level accounts.
    if (targetUser.role !== 'user' && actingAdmin.role !== 'superadmin') {
      throw new BadRequestException('Only superadmin can delete admin accounts');
    }

    await this.usersService.deleteById(userId);
    return { success: true };
  }

  @Post('users/:userId/username')
  async updateUsername(
    @Param('userId') userId: string,
    @Body() body: { adminUserId: string; username: string },
  ) {
    await this.assertAdminEditor(body?.adminUserId);

    if (!body?.username || body.username.trim().length < 2) {
      throw new BadRequestException('Username must be at least 2 characters');
    }

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    const existing = await this.usersService.findByUsername(body.username.trim());
    if (existing && existing.id !== userId) {
      throw new BadRequestException('Username already taken');
    }

    const updated = await this.usersService.setUsername(userId, body.username.trim());
    return { success: true, user: updated };
  }

  @Post('users/:userId/password')
  async updatePassword(
    @Param('userId') userId: string,
    @Body() body: { adminUserId: string; password: string },
  ) {
    await this.assertAdminEditor(body?.adminUserId);

    if (!body?.password || body.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await this.usersService.setPasswordHash(userId, passwordHash);
    return { success: true };
  }

  @Get('events')
  async getEvents(@Query('adminUserId') adminUserId: string) {
    await this.assertAdmin(adminUserId);

    return [
      { id: 1, message: 'Admin panel opened', time: 'just now', severity: 'info' },
      { id: 2, message: 'User list refreshed', time: '1 min ago', severity: 'info' },
      { id: 3, message: 'System health is stable', time: '5 min ago', severity: 'success' },
    ];
  }

  @Get('feedbacks')
  async getFeedbacks(
    @Query('adminUserId') adminUserId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    await this.assertAdmin(adminUserId);
    return this.feedbackService.findPaginatedForAdmin(
      Number(page) || 1,
      Number(limit) || 10,
      search,
    );
  }

  @Get('feedbacks/:id')
  async getFeedbackById(@Param('id') id: string, @Query('adminUserId') adminUserId: string) {
    await this.assertAdmin(adminUserId);
    return this.feedbackService.findOneForAdmin(id);
  }

  @Post('feedbacks')
  async createFeedback(@Body() body: AdminCreateFeedbackDto) {
    await this.assertAdminEditor(body?.adminUserId);
    return this.feedbackService.create(body.userId, body.message);
  }

  @Patch('feedbacks/:id')
  async updateFeedback(@Param('id') id: string, @Body() body: AdminUpdateFeedbackDto) {
    await this.assertAdminEditor(body?.adminUserId);
    return this.feedbackService.updateMessage(id, body.message);
  }

  @Delete('feedbacks/:id')
  async deleteFeedback(@Param('id') id: string, @Query('adminUserId') adminUserId: string) {
    await this.assertAdminEditor(adminUserId);
    return this.feedbackService.remove(id);
  }

  @Post('feedbacks/:id/reply')
  async sendFeedbackReply(@Param('id') id: string, @Body() body: AdminSendFeedbackReplyDto) {
    await this.assertAdminEditor(body?.adminUserId);
    return this.feedbackService.sendReplyByEmail(id, body.message);
  }
}
