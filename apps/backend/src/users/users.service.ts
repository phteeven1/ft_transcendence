import { Injectable } from '@nestjs/common';
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
};

export type AuthResult = {
  user: User | null;
};

function isPrismaUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    name: string,
    password: string,
    email: string,
  ): Promise<AuthResult> {
    const hashedPassword = await hash(password, SALT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { name, password: hashedPassword, email },
        ...userWithMemberships,
      });
      return { user: toApiUser(user) };
    } catch (error) {
      if (isPrismaUniqueConstraint(error)) {
        return { user: null };
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
  ): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { name },
      ...userWithMemberships,
    });
    if (!user) return undefined;

    const passwordMatches = await compare(password, user.password);
    return passwordMatches ? toApiUser(user) : undefined;
  }

  async signIn(name: string, password: string): Promise<AuthResult> {
    const user = await this.findByCredentials(name, password);
    return { user: user ?? null };
  }

  async updateProfile(
    userId: number,
    data: {
      userName?: string;
    },
  ): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.userName ? { name: data.userName } : {}),
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

    if (!user) return { success: false };

    const passwordMatches = await compare(oldPassword, user.password);
    if (!passwordMatches) return { success: false };

    const newHashedPassword = await hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });
    return { success: true };
  }
}
