import { Injectable } from '@nestjs/common';
import { GroupRole } from '@ft-transcendence/database';
import { groupWithMemberships, toApiGroup } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export type Group = {
  id: number;
  name: string;
  admins: number[];
  members: number[];
  currentVocabulary?: number;
};

export type Member = {
  id: number;
  name: string;
  isAdmin: boolean;
};

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(groupName: string, creatorId: number): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        name: groupName,
        memberships: {
          create: { userId: creatorId, role: GroupRole.ADMIN },
        },
      },
      ...groupWithMemberships,
    });
    await this.usersService.addAdminGroup(creatorId, group.id);
    return toApiGroup(group);
  }

  async addMember(
    groupId: number,
    userId: number,
    authorId: number,
  ): Promise<Group | undefined> {
    void authorId;
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      ...groupWithMemberships,
    });
    if (!group) return undefined;
    const existing = group.memberships.find((m) => m.userId === userId);
    if (existing) return toApiGroup(group);
    await this.prisma.groupMembership.create({
      data: { groupId, userId, role: GroupRole.MEMBER },
    });
    await this.usersService.addMemberGroup(userId, groupId);

    return this.findById(groupId);
  }

  async promote(
    groupId: number,
    userId: number,
    authorId: number, // the admin performing the promotion
  ): Promise<Group | undefined> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership || membership.role !== GroupRole.MEMBER) {
      return this.findById(groupId);
    }
    await this.prisma.groupMembership.update({
      where: { userId_groupId: { userId, groupId } },
      data: { role: GroupRole.ADMIN },
    });
    await this.usersService.removeMemberGroup(userId, groupId);
    await this.usersService.addAdminGroup(userId, groupId);
    void authorId;

    return this.findById(groupId);
  }

  async demote(
    groupId: number,
    userId: number,
    authorId: number,
  ): Promise<Group | undefined> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership || membership.role !== GroupRole.ADMIN) {
      return this.findById(groupId);
    }
    await this.prisma.groupMembership.update({
      where: { userId_groupId: { userId, groupId } },
      data: { role: GroupRole.MEMBER },
    });
    await this.usersService.removeAdminGroup(userId, groupId);
    await this.usersService.addMemberGroup(userId, groupId);
    void authorId;

    return this.findById(groupId);
  }

  async leave(
    groupId: number,
    userId: number,
    authorId: number,
  ): Promise<Group | undefined> {
    const deleted = await this.prisma.groupMembership.deleteMany({
      where: { userId, groupId },
    });
    if (deleted.count === 0) return this.findById(groupId);
    await this.usersService.removeAdminGroup(userId, groupId);
    await this.usersService.removeMemberGroup(userId, groupId);
    void authorId;

    const remaining = await this.prisma.groupMembership.count({
      where: { groupId },
    });
    if (remaining === 0) {
      await this.delete(groupId);
      return undefined;
    }
    return this.findById(groupId);
  }

  async rename(
    groupId: number,
    groupName: string,
    authorId: number,
  ): Promise<Group | undefined> {
    try {
      const group = await this.prisma.group.update({
        where: { id: groupId },
        data: { name: groupName },
        ...groupWithMemberships,
      });
      void authorId;

      return toApiGroup(group);
    } catch {
      return undefined;
    }
  }

  async expel(
    groupId: number,
    userId: number,
    authorId: number,
  ): Promise<Group | undefined> {
    const deleted = await this.prisma.groupMembership.deleteMany({
      where: { userId, groupId, role: GroupRole.MEMBER },
    });
    if (deleted.count === 0) return this.findById(groupId);
    await this.usersService.removeMemberGroup(userId, groupId);
    void authorId;

    return this.findById(groupId);
  }

  async delete(groupId: number): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      ...groupWithMemberships,
    });
    if (!group) return false;

    for (const m of group.memberships) {
      if (m.role === GroupRole.ADMIN) {
        await this.usersService.removeAdminGroup(m.userId, groupId);
      } else {
        await this.usersService.removeMemberGroup(m.userId, groupId);
      }
    }

    await this.prisma.group.delete({ where: { id: groupId } });
    return true;
  }

  async findMembers(groupId: number): Promise<Member[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: true },
    });
    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      isAdmin: m.role === GroupRole.ADMIN,
    }));
  }

  async findById(groupId: number): Promise<Group | undefined> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      ...groupWithMemberships,
    });
    return group ? toApiGroup(group) : undefined;
  }

  async findByName(groupName: string): Promise<Group | undefined> {
    const group = await this.prisma.group.findFirst({
      where: { name: groupName },
      ...groupWithMemberships,
    });
    return group ? toApiGroup(group) : undefined;
  }
}
