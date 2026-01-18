import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Friend, Prisma } from '@prisma/client';

@Injectable()
export class FriendRepository {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, name: string): Promise<Friend> {
        return this.prisma.friend.create({
            data: {
                name,
                userId,
            },
        });
    }

    async findByUserId(userId: string): Promise<Friend[]> {
        return this.prisma.friend.findMany({
            where: { userId },
        });
    }

    async delete(id: string): Promise<Friend> {
        return this.prisma.friend.delete({
            where: { id },
        });
    }
}
