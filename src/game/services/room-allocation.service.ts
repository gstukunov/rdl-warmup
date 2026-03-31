import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Game } from '../entities/game.entity';
import { GameStatus } from '../entities/game.entity';
import type { GameParticipant } from '../entities/game-participant.entity';
import { ParticipantRole, ParticipantPosition } from '../entities/game-participant.entity';
import type { IGameRepository } from '../repositories/game.repository.interface';
import { GAME_REPOSITORY } from '../repositories/game.repository.interface';
import type { IGameParticipantRepository } from '../repositories/game-participant.repository.interface';
import { GAME_PARTICIPANT_REPOSITORY } from '../repositories/game-participant.repository.interface';
import type { AllocatedRoom } from '../types';

@Injectable()
export class RoomAllocationService {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(GAME_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IGameParticipantRepository,
  ) {}

  async allocatePlayers(
    gameId: string,
    initiatorTelegramId: number,
  ): Promise<AllocatedRoom[]> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    const initiator = game.participants?.find(
      (p) => Number(p.telegramId) === initiatorTelegramId,
    );

    if (!initiator) {
      throw new ForbiddenException(
        'Только участник может начать распределение',
      );
    }

    let players =
      game.participants?.filter(
        (p) => p.role === ParticipantRole.PLAYER && p.telegramId !== null,
      ) || [];
    let judges =
      game.participants?.filter(
        (p) => p.role === ParticipantRole.JUDGE && p.telegramId !== null,
      ) || [];
    let wings =
      game.participants?.filter(
        (p) => p.role === ParticipantRole.WING && p.telegramId !== null,
      ) || [];

    const initialPlayerCount = players.length;

    if (wings.length > 0 && initialPlayerCount < 8) {
      const playersNeeded = 8 - initialPlayerCount;
      const wingsToConvert = Math.min(wings.length, playersNeeded);
      const convertedWings = wings.slice(0, wingsToConvert);
      wings = wings.slice(wingsToConvert);

      for (const wing of convertedWings) {
        if (wing.id) {
          await this.participantRepository.update(wing.id, {
            role: ParticipantRole.PLAYER,
          });
          wing.role = ParticipantRole.PLAYER;
        }
      }

      players = [...players, ...convertedWings];
    }

    if (players.length < 2) {
      throw new BadRequestException(
        'Недостаточно игроков для начала игры (минимум 2)',
      );
    }

    players = this.shuffleArray([...players]);

    const playersAfterConversion = players.length;
    const fullRoomsCount = Math.floor(playersAfterConversion / 8);
    const remainingPlayers = playersAfterConversion % 8;

    const rooms: AllocatedRoom[] = [];
    let playerIndex = 0;

    for (let roomNum = 1; roomNum <= fullRoomsCount; roomNum++) {
      const roomPlayers = players.slice(playerIndex, playerIndex + 8);
      playerIndex += 8;

      const room = this.allocateFullRoom(roomNum, roomPlayers);
      rooms.push(room);
    }

    if (remainingPlayers > 0) {
      const remainingRoomPlayers = players.slice(playerIndex);
      const minPlayersForShortGame = 4;

      if (remainingPlayers >= minPlayersForShortGame) {
        const room = this.allocateShortRoom(
          fullRoomsCount + 1,
          remainingRoomPlayers,
        );
        rooms.push(room);
      } else if (
        wings.length > 0 &&
        remainingPlayers + wings.length >= minPlayersForShortGame
      ) {
        const wingsNeeded = minPlayersForShortGame - remainingPlayers;
        const convertedWings = wings.slice(0, wingsNeeded);
        wings = wings.slice(wingsNeeded);

        for (const wing of convertedWings) {
          if (wing.id) {
            await this.participantRepository.update(wing.id, {
              role: ParticipantRole.PLAYER,
            });
            wing.role = ParticipantRole.PLAYER;
          }
        }

        const allPlayers = [...remainingRoomPlayers, ...convertedWings];
        const room = this.allocateShortRoom(fullRoomsCount + 1, allPlayers);
        rooms.push(room);
      } else if (
        judges.length > 0 &&
        remainingPlayers + judges.length >= minPlayersForShortGame
      ) {
        const judgesNeeded = minPlayersForShortGame - remainingPlayers;
        const convertedJudges = judges.slice(0, judgesNeeded);
        judges = judges.slice(judgesNeeded);

        for (const judge of convertedJudges) {
          if (judge.id) {
            await this.participantRepository.update(judge.id, {
              role: ParticipantRole.PLAYER,
            });
            judge.role = ParticipantRole.PLAYER;
          }
        }

        const allPlayers = [...remainingRoomPlayers, ...convertedJudges];
        const room = this.allocateShortRoom(fullRoomsCount + 1, allPlayers);
        rooms.push(room);
      } else if (remainingPlayers >= 2) {
        const room = this.allocateShortRoomWithIronman(
          fullRoomsCount + 1,
          remainingRoomPlayers,
        );
        rooms.push(room);
      }
    }

    this.distributeJudges(rooms, judges);
    this.distributeWings(rooms, wings);

    await this.saveAllocations(gameId, rooms);

    return rooms;
  }

  private allocateFullRoom(
    roomNumber: number,
    players: GameParticipant[],
  ): AllocatedRoom {
    const room: AllocatedRoom = {
      roomNumber,
      openingGovernment: [],
      openingOpposition: [],
      closingGovernment: [],
      closingOpposition: [],
      judges: [],
      wings: [],
    };

    if (players.length >= 2 && players[0].telegramId && players[1].telegramId) {
      room.openingGovernment.push(
        {
          telegramId: players[0].telegramId,
          username: players[0].username,
          firstName: players[0].firstName,
          isIronman: false,
        },
        {
          telegramId: players[1].telegramId,
          username: players[1].username,
          firstName: players[1].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 4 && players[2].telegramId && players[3].telegramId) {
      room.openingOpposition.push(
        {
          telegramId: players[2].telegramId,
          username: players[2].username,
          firstName: players[2].firstName,
          isIronman: false,
        },
        {
          telegramId: players[3].telegramId,
          username: players[3].username,
          firstName: players[3].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 6 && players[4].telegramId && players[5].telegramId) {
      room.closingGovernment.push(
        {
          telegramId: players[4].telegramId,
          username: players[4].username,
          firstName: players[4].firstName,
          isIronman: false,
        },
        {
          telegramId: players[5].telegramId,
          username: players[5].username,
          firstName: players[5].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 8 && players[6].telegramId && players[7].telegramId) {
      room.closingOpposition.push(
        {
          telegramId: players[6].telegramId,
          username: players[6].username,
          firstName: players[6].firstName,
          isIronman: false,
        },
        {
          telegramId: players[7].telegramId,
          username: players[7].username,
          firstName: players[7].firstName,
          isIronman: false,
        },
      );
    }

    return room;
  }

  private allocateShortRoom(
    roomNumber: number,
    players: GameParticipant[],
  ): AllocatedRoom {
    const room: AllocatedRoom = {
      roomNumber,
      openingGovernment: [],
      openingOpposition: [],
      closingGovernment: [],
      closingOpposition: [],
      judges: [],
      wings: [],
    };

    if (players.length >= 2 && players[0].telegramId && players[1].telegramId) {
      room.openingGovernment.push(
        {
          telegramId: players[0].telegramId,
          username: players[0].username,
          firstName: players[0].firstName,
          isIronman: false,
        },
        {
          telegramId: players[1].telegramId,
          username: players[1].username,
          firstName: players[1].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 4 && players[2].telegramId && players[3].telegramId) {
      room.openingOpposition.push(
        {
          telegramId: players[2].telegramId,
          username: players[2].username,
          firstName: players[2].firstName,
          isIronman: false,
        },
        {
          telegramId: players[3].telegramId,
          username: players[3].username,
          firstName: players[3].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length > 4) {
      const remaining = players.slice(4);
      for (let i = 0; i < remaining.length; i++) {
        const player = remaining[i];
        if (!player.telegramId) continue;

        if (i === 0) {
          room.closingGovernment.push({
            telegramId: player.telegramId,
            username: player.username,
            firstName: player.firstName,
            isIronman: true,
          });
        } else if (i === 1) {
          room.closingOpposition.push({
            telegramId: player.telegramId,
            username: player.username,
            firstName: player.firstName,
            isIronman: true,
          });
        }
      }
    }

    return room;
  }

  private allocateShortRoomWithIronman(
    roomNumber: number,
    players: GameParticipant[],
  ): AllocatedRoom {
    const room: AllocatedRoom = {
      roomNumber,
      openingGovernment: [],
      openingOpposition: [],
      closingGovernment: [],
      closingOpposition: [],
      judges: [],
      wings: [],
    };

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.telegramId) continue;

      const playerData = {
        telegramId: player.telegramId,
        username: player.username,
        firstName: player.firstName,
        isIronman: false,
      };

      if (i === 0) {
        room.openingGovernment.push(playerData);
      } else if (i === 1) {
        room.openingOpposition.push(playerData);
      } else if (i === 2) {
        room.openingGovernment.push({ ...playerData, isIronman: true });
      } else if (i === 3) {
        room.openingOpposition.push({ ...playerData, isIronman: true });
      }
    }

    return room;
  }

  private distributeJudges(
    rooms: AllocatedRoom[],
    judges: GameParticipant[],
  ): void {
    let judgeIndex = 0;
    const validJudges = judges.filter((j) => j.telegramId !== null);

    while (judgeIndex < validJudges.length) {
      for (const room of rooms) {
        if (judgeIndex < validJudges.length) {
          const judge = validJudges[judgeIndex];
          room.judges.push({
            telegramId: judge.telegramId!,
            username: judge.username,
            firstName: judge.firstName,
          });
          judgeIndex++;
        }
      }
    }
  }

  private distributeWings(
    rooms: AllocatedRoom[],
    wings: GameParticipant[],
  ): void {
    let wingIndex = 0;
    const validWings = wings.filter((w) => w.telegramId !== null);

    while (wingIndex < validWings.length) {
      for (const room of rooms) {
        if (wingIndex < validWings.length) {
          const wing = validWings[wingIndex];
          room.wings.push({
            telegramId: wing.telegramId!,
            username: wing.username,
            firstName: wing.firstName,
          });
          wingIndex++;
        }
      }
    }
  }

  private async saveAllocations(
    gameId: string,
    rooms: AllocatedRoom[],
  ): Promise<void> {
    for (const room of rooms) {
      for (const pos of room.openingGovernment) {
        await this.participantRepository.updateByGameAndTelegramId(
          gameId,
          pos.telegramId,
          { position: ParticipantPosition.OPENING_GOVERNMENT },
        );
      }
      for (const pos of room.openingOpposition) {
        await this.participantRepository.updateByGameAndTelegramId(
          gameId,
          pos.telegramId,
          { position: ParticipantPosition.OPENING_OPPOSITION },
        );
      }
      for (const pos of room.closingGovernment) {
        await this.participantRepository.updateByGameAndTelegramId(
          gameId,
          pos.telegramId,
          { position: ParticipantPosition.CLOSING_GOVERNMENT },
        );
      }
      for (const pos of room.closingOpposition) {
        await this.participantRepository.updateByGameAndTelegramId(
          gameId,
          pos.telegramId,
          { position: ParticipantPosition.CLOSING_OPPOSITION },
        );
      }
    }

    const allocations = rooms.map((room) => ({
      roomNumber: room.roomNumber,
      participants: [
        ...room.openingGovernment.map((p) => ({
          telegramId: p.telegramId,
          position: 'OG',
          isIronman: p.isIronman,
        })),
        ...room.openingOpposition.map((p) => ({
          telegramId: p.telegramId,
          position: 'OO',
          isIronman: p.isIronman,
        })),
        ...room.closingGovernment.map((p) => ({
          telegramId: p.telegramId,
          position: 'CG',
          isIronman: p.isIronman,
        })),
        ...room.closingOpposition.map((p) => ({
          telegramId: p.telegramId,
          position: 'CO',
          isIronman: p.isIronman,
        })),
      ],
      judges: room.judges.map((j) => ({ telegramId: j.telegramId })),
      wings: room.wings.map((w) => ({ telegramId: w.telegramId })),
    }));

    const game = await this.gameRepository.findById(gameId);
    if (game) {
      // Update new normalized columns
      game.isAllocated = true;
      game.status = GameStatus.ALLOCATING;
      
      // Keep legacy settings for backward compatibility during transition
      game.settings = {
        ...game.settings,
        roomAllocations: allocations,
        isAllocated: true,
      };
      
      await this.gameRepository.save(game);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
