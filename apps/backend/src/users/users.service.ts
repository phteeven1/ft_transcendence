import { Injectable } from '@nestjs/common';

export type User = {
  userId: number;
  userName: string;
  userPassword: string;
  userEmail: string;
  userMemberGroups: number[];
  userAdminGroups: number[];
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
      userMemberGroups: [],
      userAdminGroups: [],
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

  findAll(): User[] {
    return this.users;
  }

  addMemberGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user && !user.userMemberGroups.includes(groupId))
      user.userMemberGroups.push(groupId);
  }

  addAdminGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user && !user.userAdminGroups.includes(groupId))
      user.userAdminGroups.push(groupId);
  }

  removeMemberGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user)
      user.userMemberGroups = user.userMemberGroups.filter(id => id !== groupId);
  }

  removeAdminGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user)
      user.userAdminGroups = user.userAdminGroups.filter(id => id !== groupId);
  }
}