import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PlayersService } from '../players/players.service';

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

  constructor(
    private readonly usersService: UsersService,
    private readonly playersService: PlayersService,
  ) {}

  create(groupName: string, creatorId: number): Group {
    const id = Number(creatorId);
    const newGroup: Group = {
      groupId: this.nextId++,
      groupName,
      groupAdmins: [id],
      groupMembers: [],
    };
    this.groups.push(newGroup);
    this.usersService.addAdminGroup(creatorId, newGroup.groupId);
    return newGroup;
  }

  addMember(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    const isAlreadyMember = group?.groupMembers.includes(uId);
    const isAlreadyAdmin = group?.groupAdmins.includes(uId);
    if (group && !isAlreadyMember && !isAlreadyAdmin) {
      group.groupMembers.push(uId);
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
    if (!group) return undefined;

    const isAdmin = group.groupAdmins.includes(uId);
    const isMember = group.groupMembers.includes(uId);

    if (isAdmin) {
      group.groupAdmins = group.groupAdmins.filter(id => id !== uId);
      this.usersService.removeAdminGroup(uId, gId);
    } else if (isMember) {
      group.groupMembers = group.groupMembers.filter(id => id !== uId);
      this.usersService.removeMemberGroup(uId, gId);
    }

    const totalMembers = group.groupAdmins.length + group.groupMembers.length;
    if (totalMembers === 0) {
      this.groups = this.groups.filter(g => g.groupId !== gId);
    }

    return group;
  }

  rename(groupId: number, groupName: string): Group | undefined {
    const gId = Number(groupId);
    const group = this.findById(gId);
    if (!group) return undefined;
    group.groupName = groupName;
    return group;
  }

  expel(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (!group) return undefined;
    if (!group.groupMembers.includes(uId)) return undefined;
    group.groupMembers = group.groupMembers.filter(id => id !== uId);
    this.usersService.removeMemberGroup(uId, gId);
    return group;
  }

  delete(groupId: number): boolean {
    const gId = Number(groupId);
    const group = this.findById(gId);
    if (!group) return false;

    // Remove group from all admins' isAdminOf
    group.groupAdmins.forEach(uId => {
      this.usersService.removeAdminGroup(uId, gId);
    });

    // Remove group from all members' isMemberOf
    group.groupMembers.forEach(uId => {
      this.usersService.removeMemberGroup(uId, gId);
    });

    // Delete all player profiles belonging to this group
    this.playersService.removeByGroup(gId);

    // Delete the group itself
    this.groups = this.groups.filter(g => g.groupId !== gId);

    return true;
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