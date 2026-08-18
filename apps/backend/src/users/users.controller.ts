import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
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
  async signin(@Body() body: { userName: string; userPassword: string }) {
    const user = await this.usersService.findByCredentials(
      body.userName,
      body.userPassword,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
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
  async changePassword(
    @Body() body: { userId: number; oldPassword: string; newPassword: string },
  ) {
    try {
      return await this.usersService.changePassword(
        body.userId,
        body.oldPassword,
        body.newPassword,
      );
    } catch {
      throw new HttpException('Incorrect password', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(Number(id));
  }
}
