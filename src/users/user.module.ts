import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserRepository } from '../repositories/user.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [UserController],
    providers: [UserRepository],
    exports: [UserRepository],
})
export class UserModule { }
