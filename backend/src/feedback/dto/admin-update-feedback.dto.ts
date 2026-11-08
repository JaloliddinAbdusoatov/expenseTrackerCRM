import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminUpdateFeedbackDto {
  @IsUUID()
  adminUserId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}
