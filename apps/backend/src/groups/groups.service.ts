import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

export type Group = {
  groupId: number;
  groupName: string;
  groupAdmins: number[];
  groupMembers: number[];
};

export type Member = {
  memberId: number;
  memberName: string;
  isAdmin: boolean;
};

@Injectable()
export class GroupsService {
  private groups: Group[] = [];
  private nextId = 1;

  constructor(private readonly usersService: UsersService) {}

  create(groupName: string, creatorId: number): Group {
    const id = Number(creatorId);
    const newGroup: Group = {
      groupId: this.nextId++,
      groupName,
      groupAdmins: [id],
      groupMembers: [],
    };
    this.groups.push(newGroup);
    // update the creator's user object too
    this.usersService.addAdminGroup(creatorId, newGroup.groupId);
    return newGroup;
  }

  addMember(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (group && !group.groupMembers.includes(uId)) {
      group.groupMembers.push(uId);
      // update the user object too
      this.usersService.addMemberGroup(uId, gId);
    }
    return group;
  }

  promote(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (group && group.groupMembers.includes(uId)) {
      group.groupMembers = group.groupMembers.filter(id => id !== uId);
      group.groupAdmins.push(uId);
      this.usersService.removeMemberGroup(uId, gId);
      this.usersService.addAdminGroup(uId, gId);
    }
    return group;
  }

  demote(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (group && group.groupAdmins.includes(uId)) {
      group.groupAdmins = group.groupAdmins.filter(id => id !== uId);
      group.groupMembers.push(uId);
      this.usersService.removeAdminGroup(uId, gId);
      this.usersService.addMemberGroup(uId, gId);
    }
    return group;
  }

  leave(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (group && group.groupMembers.includes(uId)) {
      group.groupMembers = group.groupMembers.filter(id => id !== uId);
      this.usersService.removeMemberGroup(uId, gId);
    }
    return group;
  }

  findMembers(groupId: number): Member[] {
    const gId = Number(groupId);
    const group = this.findById(gId);
    if (!group) return [];

    const admins: Member[] = group.groupAdmins
      .map(id => this.usersService.findById(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map(u => ({ memberId: u.userId, memberName: u.userName, isAdmin: true }));

    const members: Member[] = group.groupMembers
      .map(id => this.usersService.findById(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map(u => ({ memberId: u.userId, memberName: u.userName, isAdmin: false }));

    return [...admins, ...members];
  }

  findById(groupId: number): Group | undefined {
    const gId = Number(groupId);
    return this.groups.find(g => g.groupId === gId);
  }

  findByName(groupName: string): Group | undefined {
    return this.groups.find(g => g.groupName === groupName);
  }

  findAll(): Group[] {
    return this.groups;
  }
}