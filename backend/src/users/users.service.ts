import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByUsername(username: string) {
    return this.usersRepo.findOne({ where: { username } });
  }

  findAll() {
    return this.usersRepo.find();
  }

  create(data: Partial<User>) {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.usersRepo.update(userId, { avatarUrl });
    return this.findById(userId);
  }

  async updateEmail(userId: string, email: string) {
    await this.usersRepo.update(userId, { email, emailVerified: true });
    return this.findById(userId);
  }

  async updateCurrency(userId: string, currency: 'USD' | 'UZS' | 'JPY' | 'RUB') {
    await this.usersRepo.update(userId, { currency });
    return this.findById(userId);
  }

  async createArtificialUser(username: string) {
    // Create artificial user with fake email and password
    const email = `${username.toLowerCase()}@artificial.local`;
    const passwordHash = 'artificial_user_' + Math.random().toString(36);
    
    const user = this.usersRepo.create({
      email,
      username,
      passwordHash,
      emailVerified: true,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    });
    return this.usersRepo.save(user);
  }

  async findAllForAdmin(search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.emailVerified',
        'user.role',
        'user.isBlocked',
        'user.createdAt',
      ])
      .orderBy('user.createdAt', 'DESC');

    if (search && search.trim()) {
      const value = `%${search.trim()}%`;
      qb.where('user.email LIKE :value OR user.username LIKE :value', { value });
    }

    return qb.getMany();
  }

  async findAllForAdminPaginated(search = '', page = 1, limit = 20) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.emailVerified',
        'user.role',
        'user.isBlocked',
        'user.createdAt',
      ])
      .orderBy('user.createdAt', 'DESC');

    if (search.trim()) {
      const value = `%${search.trim()}%`;
      qb.where('user.email LIKE :value OR user.username LIKE :value', { value });
    }

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;
    qb.skip(skip).take(safeLimit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async setBlocked(userId: string, isBlocked: boolean) {
    await this.usersRepo.update(userId, { isBlocked });
    return this.findById(userId);
  }

  async setUsername(userId: string, username: string) {
    await this.usersRepo.update(userId, { username });
    return this.findById(userId);
  }

  async setPasswordHash(userId: string, passwordHash: string) {
    await this.usersRepo.update(userId, { passwordHash });
    return this.findById(userId);
  }

  async deleteById(userId: string) {
    try {
      await this.usersRepo.delete(userId);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new BadRequestException(
          'Cannot delete user with related records. Remove related data first.',
        );
      }
      throw error;
    }
  }

  countAllUsers() {
    return this.usersRepo.count();
  }

  countByRole(role: 'user' | 'admin' | 'superadmin' | 'viewer_admin') {
    return this.usersRepo.count({ where: { role } });
  }

  countBlockedUsers() {
    return this.usersRepo.count({ where: { isBlocked: true } });
  }
}

