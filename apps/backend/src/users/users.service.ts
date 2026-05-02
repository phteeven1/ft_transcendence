import { Injectable } from '@nestjs/common';

export type User = {
  userId: number;
  userName: string;
  userPassword: string;
  userEmail: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
};

@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  register(userName: string, userPassword: string, userEmail: string): User {
    const newUser: User = {
      userId: this.nextId++,
      userName,
      userPassword,
      userEmail,
      isMemberOf: [],
      isAdminOf: [],
    };
    this.users.push(newUser);
    return newUser;
  }

  findById(userId: number): User | undefined {
    return this.users.find(u => u.userId === userId);
  }

  findByName(userName: string): User | undefined {
    return this.users.find(u => u.userName === userName);
  }

  findByCredentials(userName: string, userPassword: string): User | undefined {
    return this.users.find(u => u.userName === userName && u.userPassword === userPassword);
  }

  findAll(): User[] {
    return this.users;
  }

  addMemberGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user && !user.isMemberOf.includes(groupId))
      user.isMemberOf.push(groupId);
  }

  addAdminGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user && !user.isAdminOf.includes(groupId))
      user.isAdminOf.push(groupId);
  }

  removeMemberGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user)
      user.isMemberOf = user.isMemberOf.filter(id => id !== groupId);
  }

  removeAdminGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user)
      user.isAdminOf = user.isAdminOf.filter(id => id !== groupId);
  }
}