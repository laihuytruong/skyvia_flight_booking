import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S+$/;

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(passwordPattern, {
    message:
      'Current password must contain uppercase and lowercase letters, a number, and a special character, with no whitespace',
  })
  currentPassword!: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(passwordPattern, {
    message:
      'New password must contain uppercase and lowercase letters, a number, and a special character, with no whitespace',
  })
  newPassword!: string;
}
