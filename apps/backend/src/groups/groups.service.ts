import { Injectable } from '@nestjs/common';
import { GroupRole } from '@ft-transcendence/database';
import { groupWithMemberships, toApiGroup } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
    return toApiGroup(group);
  }

  async addMember(groupId: number, userId: number): Promise<Group | undefined> {
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

    return this.findById(groupId);
  }

  async promote(groupId: number, userId: number): Promise<Group | undefined> {
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

    return this.findById(groupId);
  }

  async demote(groupId: number, userId: number): Promise<Group | undefined> {
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

    return this.findById(groupId);
  }

  async leave(groupId: number, userId: number): Promise<Group | undefined> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { groupId },
      orderBy: { id: 'asc' },
    });
    const leaving = memberships.find((m) => m.userId === userId);
    if (!leaving) return this.findById(groupId);

    const others = memberships.filter((m) => m.userId !== userId);
    if (others.length === 0) {
      await this.delete(groupId);
      return undefined;
    }

    const remainingAdmins = others.filter((m) => m.role === GroupRole.ADMIN);
    if (leaving.role === GroupRole.ADMIN && remainingAdmins.length === 0) {
      const nextAdmin = others[0];
      if (nextAdmin) {
        await this.prisma.groupMembership.update({
          where: { id: nextAdmin.id },
          data: { role: GroupRole.ADMIN },
        });
      }
    }

    await this.prisma.groupMembership.delete({
      where: { id: leaving.id },
    });
    return this.findById(groupId);
  }

  async rename(groupId: number, groupName: string): Promise<Group | undefined> {
    try {
      const group = await this.prisma.group.update({
        where: { id: groupId },
        data: { name: groupName },
        ...groupWithMemberships,
      });

      return toApiGroup(group);
    } catch {
      return undefined;
    }
  }

  async expel(groupId: number, userId: number): Promise<Group | undefined> {
    const deleted = await this.prisma.groupMembership.deleteMany({
      where: { userId, groupId, role: GroupRole.MEMBER },
    });
    if (deleted.count === 0) return this.findById(groupId);

    return this.findById(groupId);
  }

  async delete(groupId: number): Promise<boolean> {
    try {
      await this.prisma.group.delete({ where: { id: groupId } });
      return true;
    } catch {
      return false;
    }
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
}
