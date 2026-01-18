import { Controller, Get, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { FriendRepository } from '../repositories/friend.repository';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendController {
    constructor(private friendRepository: FriendRepository) { }

    @Post()
    async addFriend(@GetUser() user: any, @Body('name') name: string) {
        return this.friendRepository.create(user.id, name);
    }

    @Get()
    async getFriends(@GetUser() user: any) {
        return this.friendRepository.findByUserId(user.id);
    }

    @Delete(':id')
    async removeFriend(@Param('id') id: string) {
        return this.friendRepository.delete(id);
    }
}
