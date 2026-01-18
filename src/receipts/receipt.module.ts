import { Module } from '@nestjs/common';
import { ReceiptController } from './receipt.controller';
import { ReceiptRepository } from '../repositories/receipt.repository';
import { AIModule } from '../ai/ai.module';

@Module({
    imports: [AIModule],
    controllers: [ReceiptController],
    providers: [ReceiptRepository],
})
export class ReceiptModule { }
