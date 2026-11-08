import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminCreateFeedbackDto {
  @IsUUID()
  adminUserId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}
