import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}
