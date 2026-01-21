import { Controller, Post, Get, Body, Param, UseGuards, Delete, InternalServerErrorException } from '@nestjs/common';
import { ReceiptRepository } from '../repositories/receipt.repository';
import { AIService } from '../ai/ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptController {
    constructor(
        private receiptRepository: ReceiptRepository,
        private aiService: AIService,
    ) { }

    @Post('scan')
    async scan(@Body('image') base64Image: string, @Body('mimeType') mimeType: string) {
        return this.aiService.scanReceipt(base64Image, mimeType || 'image/jpeg');
    }

    @Get('stats')
    async getStats(@GetUser() user: any) {
        return this.receiptRepository.getUserStats(user.id);
    }

    @Post()
    async createReceipt(@GetUser() user: any, @Body() data: any) {
        return this.receiptRepository.create({
            ...data,
            creatorId: user.id,
        });
    }

    @Get()
    async getReceipts(@GetUser() user: any) {
        return this.receiptRepository.findByUserId(user.id);
    }

    @Get(':id')
    async getReceipt(@Param('id') id: string) {
        return this.receiptRepository.findById(id);
    }

    @Post('items/:itemId/assign')
    async assignItem(
        @Param('itemId') itemId: string,
        @Body('userId') userId?: string,
        @Body('friendId') friendId?: string,
    ) {
        return this.receiptRepository.assignItem(itemId, userId, friendId);
    }

    @Delete('assignments/:id')
    async unassignItem(@Param('id') id: string) {
        return this.receiptRepository.unassignItem(id);
    }

    @Post(':id/payments')
    async addPayment(
        @Param('id') receiptId: string,
        @Body('amount') amount: number,
        @Body('userId') userId?: string,
        @Body('friendId') friendId?: string,
    ) {
        return this.receiptRepository.addPayment(receiptId, amount, userId, friendId);
    }

    @Get(':id/split')
    async getSplit(@Param('id') id: string) {
        try {
            const receipt = await this.receiptRepository.findById(id);
            if (!receipt) throw new InternalServerErrorException('Receipt not found');

            // Calculate split logic
            const participants: Record<string, { id: string; name: string; type: 'user' | 'friend'; spent: number; paid: number; owes: number }> = {};

            const getParticipantKey = (uId?: string | null, fId?: string | null) => {
                if (uId) return `user-${uId}`;
                if (fId) return `friend-${fId}`;
                return 'unknown';
            };

            const addParticipant = (uId?: string | null, fId?: string | null, name?: string) => {
                const key = getParticipantKey(uId, fId);
                if (!participants[key]) {
                    participants[key] = {
                        id: (uId || fId) as string,
                        name: name || 'Unknown',
                        type: uId ? 'user' : 'friend',
                        spent: 0,
                        paid: 0,
                        owes: 0,
                    };
                }
                return key;
            };

            // 1. Calculate base spending per item
            receipt.items.forEach(item => {
                const assignmentCount = item.assignments.length;
                if (assignmentCount === 0) return; // No one assigned?

                const pricePerPerson = item.price / assignmentCount;
                item.assignments.forEach(as => {
                    const name = as.user?.name || as.friend?.name || 'Unknown';
                    const key = addParticipant(as.userId, as.friendId, name);
                    participants[key].spent += pricePerPerson;
                });
            });

            // 2. Distribute fees (tax, delivery, service) proportionally to spending
            const fees = receipt.tax + receipt.delivery + receipt.service;
            const subtotal = receipt.subtotal || 1; // avoid div by 0

            Object.values(participants).forEach(p => {
                const shareRatio = p.spent / subtotal;
                p.spent += fees * shareRatio;
            });

            // 3. Track payments
            receipt.payments.forEach(pay => {
                const name = pay.user?.name || pay.friend?.name || 'Unknown';
                const key = addParticipant(pay.userId, pay.friendId, name);
                participants[key].paid += pay.amount;
            });

            // 4. Final owes calculation
            const results = Object.values(participants).map(p => ({
                ...p,
                owes: p.spent - p.paid,
            }));

            return {
                receiptId: receipt.id,
                total: receipt.total,
                participants: results,
            };
        } catch (error) {
            console.error('Split Error:', error);
            throw new InternalServerErrorException(error.message);
        }
    }
}
