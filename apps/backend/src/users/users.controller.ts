import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  register(@Body() body: { userName: string; userPassword: string; userEmail: string }) {
    return this.usersService.register(body.userName, body.userPassword, body.userEmail);
  }

  @Post('signin')
  signin(@Body() body: { userName: string; userPassword: string }) {
    const user = this.usersService.findByCredentials(body.userName, body.userPassword);
    if (!user) throw new Error('Invalid credentials');
    return user;
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(Number(id));
  }

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.usersService.findByName(name);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}