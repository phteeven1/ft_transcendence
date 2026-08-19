import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GameGateway } from '../games/game.gateway';
import { UserSessionGuard } from '../users/user-session.guard';
import { AuthenticatedUserId } from '../users/authenticated-user.decorator';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly gateway: GameGateway,
  ) {}

  @Post('create')
  @UseGuards(UserSessionGuard)
  async create(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupName: string },
  ) {
    const created = await this.groupsService.create(body.groupName, userId);
    this.gateway.emitDashboardUpdate(created.id);
    this.gateway.emitMembershipChanged(userId);
    return created;
  }

  @Post('addMember')
  @UseGuards(UserSessionGuard)
  async addMember(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number },
  ) {
    const group = await this.groupsService.addMember(body.groupId, userId);
    if (group) {
      this.gateway.emitDashboardUpdate(body.groupId);
      this.gateway.emitMembershipChanged(userId);
    }
    return group;
  }

  @Post('promote')
  @UseGuards(UserSessionGuard)
  async promote(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; userId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    const group = await this.groupsService.promote(body.groupId, body.userId);
    if (group) this.gateway.emitDashboardUpdate(body.groupId);
    return group;
  }

  @Post('demote')
  @UseGuards(UserSessionGuard)
  async demote(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; userId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    const group = await this.groupsService.demote(body.groupId, body.userId);
    if (group) this.gateway.emitDashboardUpdate(body.groupId);
    return group;
  }

  @Post('leave')
  @UseGuards(UserSessionGuard)
  async leave(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number },
  ) {
    const remaining = await this.groupsService.leave(body.groupId, userId);
    this.gateway.emitDashboardUpdate(body.groupId);
    this.gateway.emitMembershipChanged(userId);
    return remaining;
  }

  @Post('rename')
  @UseGuards(UserSessionGuard)
  async rename(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; groupName: string },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    const renamed = await this.groupsService.rename(
      body.groupId,
      body.groupName,
    );
    if (renamed) this.gateway.emitDashboardUpdate(body.groupId);
    return renamed;
  }

  @Post('expel')
  @UseGuards(UserSessionGuard)
  async expel(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number; userId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    const remaining = await this.groupsService.expel(body.groupId, body.userId);
    if (remaining) {
      this.gateway.emitDashboardUpdate(body.groupId);
      this.gateway.emitMembershipChanged(body.userId);
    }
    return remaining;
  }

  @Post('delete')
  @UseGuards(UserSessionGuard)
  async delete(
    @AuthenticatedUserId() userId: number,
    @Body() body: { groupId: number },
  ) {
    await this.groupsService.assertAdmin(userId, body.groupId);
    const result = await this.groupsService.delete(body.groupId);
    if (result.deleted) {
      this.gateway.emitDashboardUpdate(body.groupId);
      for (const memberId of result.memberIds) {
        this.gateway.emitMembershipChanged(memberId);
      }
    }
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
