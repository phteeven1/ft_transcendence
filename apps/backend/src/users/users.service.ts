import { ConflictException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hash, compare } from 'bcryptjs';
import { toApiUser, userWithMemberships } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { GameGateway } from '../games/game.gateway';

const SALT_ROUNDS = 10;
const USERNAME_OR_EMAIL_TAKEN =
  'A user with this username or email already exists.';

function isPrismaUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

export type User = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
};

export type ParentAuthResult = User & { sessionToken: string };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gateway: GameGateway,
  ) {}

  async register(
    name: string,
    password: string,
    email: string,
  ): Promise<ParentAuthResult> {
    const hashedPassword = await hash(password, SALT_ROUNDS);
    const sessionToken = randomUUID();
    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          password: hashedPassword,
          email,
          parentSessionToken: sessionToken,
        },
        ...userWithMemberships,
      });
      this.gateway.emitParentSessionReplaced(user.id, sessionToken);
      return { ...toApiUser(user), sessionToken };
    } catch (error) {
      if (isPrismaUniqueConstraint(error)) {
        throw new ConflictException(USERNAME_OR_EMAIL_TAKEN);
      }
      throw error;
    }
  }

  async findById(userId: number): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      ...userWithMemberships,
    });
    return user ? toApiUser(user) : undefined;
  }

  async findByCredentials(
    name: string,
    password: string,
  ): Promise<ParentAuthResult | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { name },
      ...userWithMemberships,
    });
    if (!user) return undefined;

    const passwordMatches = await compare(password, user.password);
    if (!passwordMatches) return undefined;

    const sessionToken = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { parentSessionToken: sessionToken },
    });
    this.gateway.emitParentSessionReplaced(user.id, sessionToken);
    return { ...toApiUser(user), sessionToken };
  }

  async updateProfile(
    userId: number,
    data: {
      userName?: string;
    },
  ): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.userName ? { name: data.userName } : {}),
        },
        ...userWithMemberships,
      });
      return toApiUser(user);
    } catch (error) {
      if (isPrismaUniqueConstraint(error)) {
        throw new ConflictException(USERNAME_OR_EMAIL_TAKEN);
      }
      throw error;
    }
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
