import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';

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

  @Post('update')
  updateProfile(
    @Body()
    body: {
      userId: number;
      userName?: string;
    },
  ) {
    return this.usersService.updateProfile(body.userId, {
      userName: body.userName,
    });
  }

  @Post('changePassword')
  changePassword(
    @Body() body: { userId: number; oldPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(
      body.userId,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(Number(id));
  }
}
