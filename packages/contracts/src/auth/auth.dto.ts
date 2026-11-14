import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S+$/;

export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(passwordPattern, {
    message:
      'Password must contain uppercase and lowercase letters, a number, and a special character, with no whitespace',
  })
  password!: string;
}

export class RegisterDto extends LoginDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString()
  @MaxLength(8192)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResendVerificationDto extends ForgotPasswordDto {}

export class VerifyEmailDto extends ForgotPasswordDto {
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must contain exactly 6 digits' })
  code!: string;
}

export class ResetPasswordDto extends ForgotPasswordDto {
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must contain exactly 6 digits' })
  code!: string;

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
