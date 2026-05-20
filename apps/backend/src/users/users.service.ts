import { Injectable } from '@nestjs/common';

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
  private users: User[] = [];
  private nextId = 1;

  register(name: string, password: string, email: string): User {
    const newUser: User = {
      id: this.nextId++,
      name: name,
      password: password,
      email: email,
      isMemberOf: [],
      isAdminOf: [],
    };
    this.users.push(newUser);
    return newUser;
  }

  findById(userId: number): User | undefined {
    return this.users.find((u) => u.id === userId);
  }

  findByName(name: string): User | undefined {
    return this.users.find((u) => u.name === name);
  }

  findByCredentials(name: string, password: string): User | undefined {
    return this.users.find(
      (u) => u.name === name && u.password === password,
    );
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
    if (user && !user.isAdminOf.includes(groupId)) user.isAdminOf.push(groupId);
  }

  removeMemberGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user) user.isMemberOf = user.isMemberOf.filter((id) => id !== groupId);
  }

  removeAdminGroup(userId: number, groupId: number): void {
    const user = this.findById(userId);
    if (user) user.isAdminOf = user.isAdminOf.filter((id) => id !== groupId);
  }
}
