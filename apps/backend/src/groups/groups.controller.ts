import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('create')
  create(@Body() body: { groupName: string; creatorId: number }) {
    return this.groupsService.create(body.groupName, body.creatorId);
  }

  @Post('addMember')
  addMember(
    @Body() body: { groupId: number; userId: number; authorId: number },
  ) {
    return this.groupsService.addMember(
      body.groupId,
      body.userId,
      body.authorId,
    );
  }

  @Post('promote')
  promote(@Body() body: { groupId: number; userId: number; authorId: number }) {
    return this.groupsService.promote(body.groupId, body.userId, body.authorId);
  }

  @Post('demote')
  demote(@Body() body: { groupId: number; userId: number; authorId: number }) {
    return this.groupsService.demote(body.groupId, body.userId, body.authorId);
  }

  @Post('leave')
  leave(@Body() body: { groupId: number; userId: number; authorId: number }) {
    return this.groupsService.leave(body.groupId, body.userId, body.authorId);
  }

  @Post('rename')
  rename(
    @Body() body: { groupId: number; groupName: string; authorId: number },
  ) {
    return this.groupsService.rename(
      body.groupId,
      body.groupName,
      body.authorId,
    );
  }

  @Post('expel')
  expel(@Body() body: { groupId: number; userId: number; authorId: number }) {
    return this.groupsService.expel(body.groupId, body.userId, body.authorId);
  }

  @Post('delete')
  delete(@Body() body: { groupId: number }) {
    return this.groupsService.delete(body.groupId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.groupsService.findById(Number(id));
  }

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.groupsService.findByName(name);
  }

  @Get(':id/members')
  findMembers(@Param('id') id: string) {
    return this.groupsService.findMembers(Number(id));
  }
}
