import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatEntryType } from '@ft-transcendence/database';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Fetch all chat entries for a group, oldest → newest. */
  @Get('groups/:groupId/chat')
  getEntries(@Param('groupId') groupId: string) {
    return this.chatService.getEntriesForGroup(Number(groupId));
  }

  /** Post a user-written message (ADM, GEN, or MEM). */
  @Post('chat/message')
  postMessage(
    @Body()
    body: {
      groupId:  number;
      authorId: number;
      type:     Exclude<ChatEntryType, 'LOG'>;
      content:  string;
    },
  ) {
    return this.chatService.postMessage(
      body.groupId,
      body.authorId,
      body.type,
      body.content,
    );
  }
}