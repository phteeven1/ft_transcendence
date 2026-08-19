import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserSessionGuard } from './user-session.guard';
import { AuthenticatedUserId } from './authenticated-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  register(
    @Body() body: { userName: string; userPassword: string; userEmail: string },
  ) {
    return this.usersService.register(
      body.userName,
      body.userPassword,
      body.userEmail,
    );
  }

  @Post('signin')
  signin(@Body() body: { userName: string; userPassword: string }) {
    return this.usersService.signIn(body.userName, body.userPassword);
  }

  @Post('validateSession')
  validateSession(@Body() body: { userId: number; token: string }) {
    return this.usersService.validateSession(body.userId, body.token);
  }

  @Post('clearSession')
  @UseGuards(UserSessionGuard)
  clearSession(
    @AuthenticatedUserId() userId: number,
    @Body() body: { token: string },
  ) {
    return this.usersService.clearSession(userId, body.token);
  }

  @Post('update')
  @UseGuards(UserSessionGuard)
  updateProfile(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      userName?: string;
    },
  ) {
    return this.usersService.updateProfile(userId, {
      userName: body.userName,
    });
  }

  @Post('changePassword')
  @UseGuards(UserSessionGuard)
  changePassword(
    @AuthenticatedUserId() userId: number,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(Number(id));
  }
}
