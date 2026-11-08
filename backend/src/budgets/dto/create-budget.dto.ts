import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { BudgetPeriod } from '../budget.entity';

export class CreateBudgetDto {
  @IsString()
  category!: string;

  @IsNumber()
  @Min(1)
  limit!: number;

  @IsEnum(['weekly', 'monthly', 'yearly'])
  period!: BudgetPeriod;

  @IsString()
  @IsOptional()
  note?: string;
}
