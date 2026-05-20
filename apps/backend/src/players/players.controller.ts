import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('create')
  create(
    @Body()
    body: {
      playerInGroup: number;
      playerParent: number;
      playerName: string;
      playerPassQuestion: string;
      playerPassAnswer: string;
    },
  ) {
    return this.playersService.create(
      body.playerInGroup,
      body.playerParent,
      body.playerName,
      body.playerPassQuestion,
      body.playerPassAnswer,
    );
  }

  @Post('rename')
  rename(@Body() body: { playerId: number; playerName: string }) {
    return this.playersService.rename(body.playerId, body.playerName);
  }

  @Post('updatePassPhrase')
  updatePassPhrase(
    @Body() body: { playerId: number; playerPassQuestion: string; playerPassAnswer: string },
  ) {
    return this.playersService.updatePassPhrase(
      body.playerId,
      body.playerPassQuestion,
      body.playerPassAnswer,
    );
  }

  @Post('remove')
  remove(@Body() body: { playerId: number }) {
    return this.playersService.remove(body.playerId);
  }


  @Get(':id')
  findById(@Param('id') id: string) {
    return this.playersService.findById(Number(id));
  }

  @Get('parent/:userId/group/:groupId')
  findByParentInGroup(
    @Param('userId') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.playersService.findByParentInGroup(Number(userId), Number(groupId));
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.playersService.findByGroup(Number(groupId));
  }
}