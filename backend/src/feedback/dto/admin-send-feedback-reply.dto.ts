import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminSendFeedbackReplyDto {
  @IsUUID()
  adminUserId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message!: string;
}
