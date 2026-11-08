import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { Income } from './income.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ExpensesService } from './expenses.service';
import { IncomesService } from './incomes.service';
import { InsightsService } from './insights.service';
import { ReportsService } from './reports.service';
import { CategoriesService } from './categories.service';
import { UsersModule } from '../users/users.module';
import { GoalsModule } from '../goals/goals.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Income]),
    UsersModule,
    GoalsModule,
    BudgetsModule,
    AuthModule,
    MailModule,
    PdfModule,
  ],
  providers: [
    ExpensesService,
    IncomesService,
    InsightsService,
    ReportsService,
    CategoriesService,
    ChatService,
  ],
  controllers: [ChatController],
})
export class ChatModule {}

