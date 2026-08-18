import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GameGateway } from '../games/game.gateway';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly gateway: GameGateway,
  ) {}

  @Post('create')
  async create(@Body() body: { groupName: string; creatorId: number }) {
    const created = await this.groupsService.create(
      body.groupName,
      body.creatorId,
    );
    this.gateway.emitDashboardUpdate(created.id);
    this.gateway.emitMembershipChanged(body.creatorId);
    return created;
  }

  @Post('addMember')
  async addMember(@Body() body: { groupId: number; userId: number }) {
    const group = await this.groupsService.addMember(body.groupId, body.userId);
    if (group) {
      this.gateway.emitDashboardUpdate(body.groupId);
      this.gateway.emitMembershipChanged(body.userId);
    }
    return group;
  }

  @Post('promote')
  async promote(@Body() body: { groupId: number; userId: number }) {
    const group = await this.groupsService.promote(body.groupId, body.userId);
    if (group) this.gateway.emitDashboardUpdate(body.groupId);
    return group;
  }

  @Post('demote')
  async demote(@Body() body: { groupId: number; userId: number }) {
    const group = await this.groupsService.demote(body.groupId, body.userId);
    if (group) this.gateway.emitDashboardUpdate(body.groupId);
    return group;
  }

  @Post('leave')
  async leave(@Body() body: { groupId: number; userId: number }) {
    const remaining = await this.groupsService.leave(body.groupId, body.userId);
    this.gateway.emitDashboardUpdate(body.groupId);
    this.gateway.emitMembershipChanged(body.userId);
    return remaining;
  }

  @Post('rename')
  async rename(@Body() body: { groupId: number; groupName: string }) {
    const renamed = await this.groupsService.rename(
      body.groupId,
      body.groupName,
    );
    if (renamed) this.gateway.emitDashboardUpdate(body.groupId);
    return renamed;
  }

  @Post('expel')
  async expel(@Body() body: { groupId: number; userId: number }) {
    const remaining = await this.groupsService.expel(body.groupId, body.userId);
    if (remaining) {
      this.gateway.emitDashboardUpdate(body.groupId);
      this.gateway.emitMembershipChanged(body.userId);
    }
    return remaining;
  }

  @Post('delete')
  async delete(@Body() body: { groupId: number }) {
    const result = await this.groupsService.delete(body.groupId);
    if (result.deleted) {
      this.gateway.emitDashboardUpdate(body.groupId);
      for (const userId of result.memberIds) {
        this.gateway.emitMembershipChanged(userId);
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
