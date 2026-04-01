import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import configuration from './config/configuration';
import { UserModule } from './user/user.module';
import { TelegramModule } from './telegram/telegram.module';
import { GameModule } from './game/game.module';
import { CleanArchitectureModule } from './clean-architecture.module';
import { EventDrivenModule } from './event-driven.module';
import { WebAppModule } from './webapp/webapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
          },
          password: configService.get('redis.password'),
          ttl: 60000,
        }),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.user'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),

        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),
    UserModule,
    TelegramModule,
    GameModule,
    CleanArchitectureModule, // Phase 3: Clean Architecture
    EventDrivenModule,       // Phase 4: Event-Driven Architecture
    WebAppModule,            // Telegram Mini App
  ],
})
export class AppModule {}
