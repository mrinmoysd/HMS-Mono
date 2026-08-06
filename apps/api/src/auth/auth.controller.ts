import { Body, Controller, Get, HttpCode, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  type ChangePasswordInput,
  type LoginInput,
  type RefreshInput,
} from '@smart-hospital/shared';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';
import { Authenticated } from '../rbac/authenticated.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput) {
    return this.auth.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(refreshSchema))
  refresh(@Body() body: RefreshInput) {
    return this.auth.refresh(body.refreshToken);
  }

  // Your own token's user. Every signed-in role, by definition.
  @Authenticated()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  // Your own password. Changing somebody else's is human_resource.staff:edit,
  // which is a different endpoint on StaffController.
  @Authenticated()
  @Post('change-password')
  @HttpCode(204)
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(@CurrentUser('id') userId: string, @Body() body: ChangePasswordInput) {
    await this.auth.changePassword(userId, body);
  }
}
