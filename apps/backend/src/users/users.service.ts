import { Injectable } from '@nestjs/common';
import { GroupRole } from '@ft-transcendence/database';
import {
  groupWithMemberships,
  toApiUser,
  userWithMemberships,
} from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

export type User = {
  id: number;
  name: string;
  password: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(name: string, password: string, email: string): Promise<User> {
    const user = await this.prisma.user.create({
      data: { name, password, email },
      ...userWithMemberships,
    });
    return toApiUser(user);
  }

  async findById(userId: number): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      ...userWithMemberships,
    });
    return user ? toApiUser(user) : undefined;
  }

  async findByName(name: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { name },
      ...userWithMemberships,
    });
    return user ? toApiUser(user) : undefined;
  }

  async findByCredentials(
    name: string,
    password: string,
  ): Promise<User | undefined> {
    const user = await this.prisma.user.findFirst({
      where: { name, password },
      ...userWithMemberships,
    });
    return user ? toApiUser(user) : undefined;
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany(userWithMemberships);
    return users.map(toApiUser);
  }

  async addMemberGroup(userId: number, groupId: number): Promise<void> {
    await this.prisma.groupMembership.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId, role: GroupRole.MEMBER },
      update: { role: GroupRole.MEMBER },
    });
  }

  async addAdminGroup(userId: number, groupId: number): Promise<void> {
    await this.prisma.groupMembership.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId, role: GroupRole.ADMIN },
      update: { role: GroupRole.ADMIN },
    });
  }

  async removeMemberGroup(userId: number, groupId: number): Promise<void> {
    await this.prisma.groupMembership.deleteMany({
      where: { userId, groupId, role: GroupRole.MEMBER },
    });
  }

  async removeAdminGroup(userId: number, groupId: number): Promise<void> {
    await this.prisma.groupMembership.deleteMany({
      where: { userId, groupId, role: GroupRole.ADMIN },
    });
  }
}
