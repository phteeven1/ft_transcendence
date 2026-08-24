import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { UserSessionGuard } from '../users/user-session.guard';
import { AuthenticatedUserId } from '../users/authenticated-user.decorator';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('create')
  @UseGuards(UserSessionGuard)
  async create(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupName: string },
  ) {
    return this.groupsService.create(body.groupName, userId);
  }

  @Post('addMember')
  @UseGuards(UserSessionGuard)
  async addMember(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number },
  ) {
    return this.groupsService.addMember(body.groupId, userId);
  }

  @Post('promote')
  @UseGuards(UserSessionGuard)
  async promote(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; userId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    return this.groupsService.promote(body.groupId, body.userId);
  }

  @Post('demote')
  @UseGuards(UserSessionGuard)
  async demote(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; userId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    return this.groupsService.demote(body.groupId, body.userId);
  }

  @Post('leave')
  @UseGuards(UserSessionGuard)
  async leave(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number },
  ) {
    return this.groupsService.leave(body.groupId, userId);
  }

  @Post('rename')
  @UseGuards(UserSessionGuard)
  async rename(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; groupName: string },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    return this.groupsService.rename(body.groupId, body.groupName);
  }

  @Post('expel')
  @UseGuards(UserSessionGuard)
  async expel(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; userId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    return this.groupsService.expel(body.groupId, body.userId);
  }

  @Post('delete')
  @UseGuards(UserSessionGuard)
  async delete(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    const result = await this.groupsService.delete(body.groupId);
    return result.deleted;
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.groupsService.findById(Number(id));
  }

  @Get(':id/members')
  findMembers(@Param('id') id: string) {
    return this.groupsService.findMembers(Number(id));
  }
}
