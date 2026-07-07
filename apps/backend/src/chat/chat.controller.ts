import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatEntryType } from '@ft-transcendence/database';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Fetch chat entries visible to the requesting group member, oldest → newest. */
  @Get('groups/:groupId/chat')
  getEntries(
    @Param('groupId') groupId: string,
    @Query('userId') userId: string,
  ) {
    const parsedGroupId = Number(groupId);
    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedGroupId) || !Number.isFinite(parsedUserId)) {
      throw new BadRequestException('groupId and userId must be valid numbers');
    }
    return this.chatService.getEntriesForGroup(parsedGroupId, parsedUserId);
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
