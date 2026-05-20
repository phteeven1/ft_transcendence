import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PlayersService } from '../players/players.service';
import { VocabulariesService } from '../vocabularies/vocabularies.service';

export type Group = {
  id: number;
  name: string;
  admins: number[];
  members: number[];
};

export type Member = {
  id: number;
  name: string;
  isAdmin: boolean;
};

@Injectable()
export class GroupsService {
  private groups: Group[] = [];
  private nextId = 1;

  constructor(
    private readonly usersService: UsersService,
    private readonly playersService: PlayersService,
    private readonly vocabulariesService: VocabulariesService,
  ) {}

  create(groupName: string, creatorId: number): Group {
    const id = Number(creatorId);
    const newGroup: Group = {
      id: this.nextId++,
      name: groupName,
      admins: [id],
      members: [],
    };
    this.groups.push(newGroup);
    this.usersService.addAdminGroup(creatorId, newGroup.id);
    return newGroup;
  }

  addMember(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    const isAlreadyMember = group?.members.includes(uId);
    const isAlreadyAdmin = group?.admins.includes(uId);
    if (group && !isAlreadyMember && !isAlreadyAdmin) {
      group.members.push(uId);
      this.usersService.addMemberGroup(uId, gId);
    }
    return group;
  }

  promote(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (group && group.members.includes(uId)) {
      group.members = group.members.filter((id) => id !== uId);
      group.admins.push(uId);
      this.usersService.removeMemberGroup(uId, gId);
      this.usersService.addAdminGroup(uId, gId);
    }
    return group;
  }

  demote(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (group && group.admins.includes(uId)) {
      group.admins = group.admins.filter((id) => id !== uId);
      group.members.push(uId);
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

    const isAdmin = group.admins.includes(uId);
    const isMember = group.members.includes(uId);

    if (isAdmin) {
      group.admins = group.admins.filter((id) => id !== uId);
      this.usersService.removeAdminGroup(uId, gId);
    } else if (isMember) {
      group.members = group.members.filter((id) => id !== uId);
      this.usersService.removeMemberGroup(uId, gId);
    }

    const totalMembers = group.admins.length + group.members.length;
    if (totalMembers === 0) {
      this.groups = this.groups.filter((g) => g.id !== gId);
    }

    return group;
  }

  rename(groupId: number, groupName: string): Group | undefined {
    const gId = Number(groupId);
    const group = this.findById(gId);
    if (!group) return undefined;
    group.name = groupName;
    return group;
  }

  expel(groupId: number, userId: number): Group | undefined {
    const gId = Number(groupId);
    const uId = Number(userId);
    const group = this.findById(gId);
    if (!group) return undefined;
    if (!group.members.includes(uId)) return undefined;
    group.members = group.members.filter((id) => id !== uId);
    this.usersService.removeMemberGroup(uId, gId);
    return group;
  }

  delete(groupId: number): boolean {
    const gId = Number(groupId);
    const group = this.findById(gId);
    if (!group) return false;

    // Remove group from all admins' isAdminOf
    group.admins.forEach((uId) => {
      this.usersService.removeAdminGroup(uId, gId);
    });

    // Remove group from all members' isMemberOf
    group.members.forEach((uId) => {
      this.usersService.removeMemberGroup(uId, gId);
    });

    // Delete all player profiles belonging to this group
    this.playersService.removeByGroup(gId);

    // Delete all vocabularies belonging to this group
    this.vocabulariesService.removeByGroup(gId);

    // Delete the group itself
    this.groups = this.groups.filter((g) => g.id !== gId);

    return true;
  }

  findMembers(groupId: number): Member[] {
    const gId = Number(groupId);
    const group = this.findById(gId);
    if (!group) return [];
    const admins: Member[] = group.admins
      .map((id) => this.usersService.findById(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map((u) => ({ id: u.id, name: u.name, isAdmin: true }));
    const members: Member[] = group.members
      .map((id) => this.usersService.findById(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map((u) => ({ id: u.id, name: u.name, isAdmin: false }));
    return [...admins, ...members];
  }

  findById(groupId: number): Group | undefined {
    const gId = Number(groupId);
    return this.groups.find((g) => g.id === gId);
  }

  findByName(groupName: string): Group | undefined {
    return this.groups.find((g) => g.name === groupName);
  }

  findAll(): Group[] {
    return this.groups;
  }
}
