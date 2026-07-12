import { Injectable } from '@nestjs/common';
import { GroupRole } from '@ft-transcendence/database';
import { hash, compare } from 'bcryptjs';
import { toApiUser, userWithMemberships } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 10;

export type User = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
  realName?: string;
  relationshipComment?: string;
  showRealName: boolean;
  showEmail: boolean;
  showRelationshipComment: boolean;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(name: string, password: string, email: string): Promise<User> {
    const hashedPassword = await hash(password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { name, password: hashedPassword, email },
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
    const user = await this.prisma.user.findUnique({
      where: { name },
      ...userWithMemberships,
    });
    if (!user) return undefined;

    const passwordMatches = await compare(password, user.password);
    return passwordMatches ? toApiUser(user) : undefined;
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

  async updateProfile(
    userId: number,
    data: {
      userName?: string;
      realName?: string;
      relationshipComment?: string;
      showRealName: boolean;
      showEmail: boolean;
      showRelationshipComment: boolean;
    },
  ): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.userName ? { name: data.userName } : {}),
        realName: data.realName,
        relationshipComment: data.relationshipComment,
        showRealName: data.showRealName,
        showEmail: data.showEmail,
        showRelationshipComment: data.showRelationshipComment,
      },
      ...userWithMemberships,
    });
    return toApiUser(user);
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      ...userWithMemberships,
    });

    if (!user) {
      throw new Error('User not found');
    } else {
      const passwordMatches: boolean = await compare(
        oldPassword,
        user.password,
      );
      if (!passwordMatches) {
        throw new Error('Old password is incorrect');
      }
      const newHashedPassword = await hash(newPassword, SALT_ROUNDS);
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
      return { success: true };
    }
  }
}
