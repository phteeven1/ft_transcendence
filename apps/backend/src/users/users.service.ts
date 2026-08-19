import {
  Injectable,
  UnauthorizedException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { toApiUser, userWithMemberships } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { GameGateway } from '../games/game.gateway';

const SALT_ROUNDS = 10;

export type User = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
};

export type UserSessionDto = {
  token: string;
  userId: number;
};

export type AuthResult = {
  user: User | null;
  session: UserSessionDto | null;
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gateway: GameGateway,
  ) {}

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
      const session = await this.replaceSession(user.id);
      return { user: toApiUser(user), session };
    } catch (error) {
      if (isPrismaUniqueConstraint(error)) {
        return { user: null, session: null };
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
    if (!user) return { user: null, session: null };
    const session = await this.replaceSession(user.id);
    return { user, session };
  }

  async replaceSession(userId: number): Promise<UserSessionDto> {
    await this.prisma.userSession.deleteMany({ where: { userId } });
    const session = await this.prisma.userSession.create({
      data: { userId },
    });
    this.gateway.emitUserSessionReplaced(userId);
    return { token: session.token, userId: session.userId };
  }

  async validateSession(
    userId: number,
    token: string,
  ): Promise<{ valid: true }> {
    const session = await this.prisma.userSession.findUnique({
      where: { userId },
    });
    if (!session || session.token !== token) {
      throw new UnauthorizedException('Invalid session token');
    }
    return { valid: true };
  }

  async clearSession(userId: number, token: string): Promise<void> {
    const deleted = await this.prisma.userSession.deleteMany({
      where: { userId, token },
    });
    if (deleted.count > 0) {
      this.gateway.emitUserSessionReplaced(userId);
    }
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
