import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private userRepository: UserRepository) { }

    @Get('profile')
    async getProfile(
        @GetUser() user: any,
        @Query('year') year?: string,
        @Query('month') month?: string
    ) {
        const y = year ? parseInt(year) : undefined;
        const m = month ? parseInt(month) : undefined;
        return this.userRepository.getProfileData(user.id, y, m);
    }
}
