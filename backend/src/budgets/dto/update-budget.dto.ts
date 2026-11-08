import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { BudgetPeriod } from '../budget.entity';

export class UpdateBudgetDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsEnum(['weekly', 'monthly', 'yearly'])
  @IsOptional()
  period?: BudgetPeriod;

  @IsString()
  @IsOptional()
  note?: string;
}
