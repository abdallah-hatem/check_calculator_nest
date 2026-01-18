import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FriendModule } from './friends/friend.module';
import { ReceiptModule } from './receipts/receipt.module';
import { ConfigModule } from '@nestjs/config';

import { UserModule } from './users/user.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    FriendModule,
    ReceiptModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
