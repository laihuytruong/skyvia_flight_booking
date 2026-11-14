import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S+$/, {
    message:
      'Current password must contain uppercase and lowercase letters, a number, and a special character, with no whitespace',
  })
  currentPassword: string;

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
