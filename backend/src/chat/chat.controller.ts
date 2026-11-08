import { Body, Controller, Post, Get, Query, Param, Delete, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ChatService } from './chat.service';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  @IsIn(['chat', 'emotions'])
  context?: 'chat' | 'emotions';

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'ja'])
  language?: 'ru' | 'en' | 'ja';
}

class GenerateReportDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsIn(['pdf', 'excel', 'html', 'all'])
  format!: 'pdf' | 'excel' | 'html' | 'all';

  @IsString()
  @IsIn(['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'])
  dateRange!: string;

  @IsOptional()
  @Type(() => Boolean)
  includeCharts?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  sendToEmail?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'ja'])
  language?: 'ru' | 'en' | 'ja';
}

class AddExpenseDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  emotion?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  category?: string; // Кастомная категория

  // Поля для повторяющихся транзакций
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['once', 'daily', 'weekly', 'monthly'])
  recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  recurrenceDaysCount?: number;
}

class AddIncomeDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  photo?: string;

  // Поля для повторяющихся транзакций
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['once', 'daily', 'weekly', 'monthly'])
  recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  recurrenceDaysCount?: number;
}

class UpdateExpenseDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  emotion?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  photo?: string;
}

class UpdateIncomeDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // POST /api/chat/message
  @Post('message')
  async handleMessage(@Body() dto: ChatMessageDto) {
    return this.chatService.handleChatMessage(dto.userId, dto.message, dto.context || 'chat', dto.language || 'en');
  }

  // GET /api/chat/expenses?userId=xxx
  @Get('expenses')
  async getExpenses(@Query('userId') userId: string) {
    return this.chatService.getExpenses(userId);
  }

  // GET /api/chat/incomes?userId=xxx
  @Get('incomes')
  async getIncomes(@Query('userId') userId: string) {
    return this.chatService.getIncomes(userId);
  }

  // GET /api/chat/emotions?userId=xxx&from=ISO&to=ISO
  @Get('emotions')
  async getEmotions(
    @Query('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.chatService.getEmotions(userId, from, to);
  }

  // PUT /api/chat/expenses/:id - Update expense (including emotion, amount, category, photo)
  @Put('expenses/:id')
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.chatService.updateExpense(id, dto.userId, {
      description: dto.description,
      note: dto.note,
      amount: dto.amount,
      emotion: dto.emotion,
      category: dto.category,
      photo: dto.photo,
    });
  }

  // DELETE /api/chat/expenses/:id?userId=xxx
  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string, @Query('userId') userId: string) {
    return this.chatService.deleteExpense(id, userId);
  }

  // PUT /api/chat/incomes/:id - Update income
  @Put('incomes/:id')
  async updateIncome(@Param('id') id: string, @Body() dto: UpdateIncomeDto) {
    return this.chatService.updateIncome(id, dto.userId, dto.description, dto.note);
  }

  // DELETE /api/chat/incomes/:id?userId=xxx
  @Delete('incomes/:id')
  async deleteIncome(@Param('id') id: string, @Query('userId') userId: string) {
    return this.chatService.deleteIncome(id, userId);
  }

  // POST /api/chat/upload-photo - Upload photo and get path
  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'photos');
          // Create directory if it doesn't exist
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generate unique filename: timestamp-random-originalname
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        // Accept only images
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
    }),
  )
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    // Return the path relative to uploads directory
    return {
      path: `/uploads/photos/${file.filename}`,
      filename: file.filename,
    };
  }

  // DELETE /api/chat/delete-photo - Delete photo file
  @Delete('delete-photo')
  async deletePhoto(@Body() body: { path: string }) {
    const { unlinkSync, existsSync } = require('fs');
    const { join } = require('path');
    
    try {
      // Extract filename from path
      const photoPath = body.path.replace(/.*\/uploads\/photos\//, '');
      const fullPath = join(process.cwd(), 'uploads', 'photos', photoPath);
      
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        console.log(`Deleted photo file: ${fullPath}`);
        return { success: true };
      } else {
        console.warn(`Photo file not found: ${fullPath}`);
        return { success: false, message: 'File not found' };
      }
    } catch (error: any) {
      console.error('Error deleting photo file:', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  // POST /api/chat/expenses - Direct add expense (no AI)
  @Post('expenses')
  async addExpense(@Body() dto: AddExpenseDto) {
    try {
      console.log('📥 Received addExpense request:', {
        userId: dto.userId,
        description: dto.description,
        amount: dto.amount,
        emotion: dto.emotion,
        hasPhoto: !!dto.photo,
        category: dto.category,
        isRecurring: dto.isRecurring,
        recurrenceType: dto.recurrenceType,
        recurrenceInterval: dto.recurrenceInterval,
        recurrenceDaysCount: dto.recurrenceDaysCount,
      });
      return await this.chatService.addExpense(
        dto.userId,
        dto.description,
        dto.amount,
        dto.emotion || 'medium',
        dto.photo,
        dto.category,
        dto.isRecurring,
        dto.recurrenceType,
        dto.recurrenceInterval,
        dto.recurrenceDaysCount,
      );
    } catch (error: any) {
      console.error('Error in addExpense controller:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      throw error;
    }
  }

  // POST /api/chat/incomes - Direct add income (no AI)
  @Post('incomes')
  async addIncome(@Body() dto: AddIncomeDto) {
    console.log('📥 Received addIncome request:', { 
      userId: dto.userId, 
      description: dto.description, 
      amount: dto.amount, 
      amountType: typeof dto.amount,
      photo: dto.photo 
    });
    return this.chatService.addIncome(
      dto.userId,
      dto.description,
      dto.amount,
      dto.photo,
      dto.isRecurring,
      dto.recurrenceType,
      dto.recurrenceInterval,
      dto.recurrenceDaysCount,
    );
  }

  // GET /api/chat/categories?userId=xxx
  @Get('categories')
  async getCategories(@Query('userId') userId: string) {
    return this.chatService.getCategories(userId);
  }

  // POST /api/chat/categories/rename
  @Post('categories/rename')
  async renameCategory(@Body() dto: { userId: string; oldCategory: string; newCategory: string }) {
    return this.chatService.renameCategory(dto.userId, dto.oldCategory, dto.newCategory);
  }

  // POST /api/chat/categories/merge
  @Post('categories/merge')
  async mergeCategories(@Body() dto: { userId: string; sourceCategory: string; targetCategory: string }) {
    return this.chatService.mergeCategories(dto.userId, dto.sourceCategory, dto.targetCategory);
  }

  // POST /api/chat/categories/update-transactions
  @Post('categories/update-transactions')
  async updateTransactionCategory(@Body() dto: { userId: string; transactionIds: string[]; newCategory: string }) {
    return this.chatService.updateTransactionCategory(dto.userId, dto.transactionIds, dto.newCategory);
  }

  // POST /api/chat/generate-report
  @Post('generate-report')
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.chatService.generateReport(
      dto.userId,
      dto.format,
      dto.dateRange,
      dto.includeCharts !== false,
      dto.sendToEmail === true,
      dto.language || 'en',
    );
  }

}

