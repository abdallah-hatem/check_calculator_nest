import { Module } from '@nestjs/common';
import { FriendController } from './friend.controller';
import { FriendRepository } from '../repositories/friend.repository';

@Module({
    controllers: [FriendController],
    providers: [FriendRepository],
})
export class FriendModule { }
