import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramNotificationService } from './telegram-notification.service';

@Module({
    imports: [ConfigModule],
    providers: [TelegramNotificationService],
    exports: [TelegramNotificationService],
})
export class NotificationModule {}
