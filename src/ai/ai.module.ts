import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [ConfigModule, NotificationModule],
    providers: [AIService],
    exports: [AIService],
})
export class AIModule { }
