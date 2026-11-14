import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto.js';

export class ResetPasswordDto extends ForgotPasswordDto {
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must contain exactly 6 digits' })
  code: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S+$/, {
    message:
      'New password must contain uppercase and lowercase letters, a number, and a special character, with no whitespace',
  })
  newPassword: string;
}
