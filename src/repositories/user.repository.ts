import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(private prisma: PrismaService) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        return this.prisma.user.create({
            data,
        });
    }

    async getProfileData(userId: string, year?: number, month?: number) {
        try {
            const dateFilter: any = {};
            if (year && month) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 1);
                dateFilter.createdAt = {
                    gte: startDate,
                    lt: endDate,
                };
            }

            const [user, payments, assignments] = await Promise.all([
                this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, email: true, name: true, createdAt: true },
                }),
                this.prisma.payment.findMany({
                    where: { userId, ...dateFilter },
                    include: { receipt: { select: { name: true, total: true, createdAt: true } } },
                }),
                this.prisma.assignment.findMany({
                    where: { userId, ...dateFilter },
                    include: {
                        item: {
                            include: {
                                receipt: true,
                                assignments: true,
                            },
                        },
                    },
                }),
            ]);

            // Calculate totals
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

            // Calculate spent based on item assignments (including proportional fees)
            let totalSpent = 0;
            const itemHistory = assignments.map(as => {
                const item = as.item;
                const assignmentCount = item.assignments.length;
                const basePrice = item.price / assignmentCount;

                // Proportional fees (tax, delivery, service)
                const fees = item.receipt.tax + item.receipt.delivery + item.receipt.service;
                const subtotal = item.receipt.subtotal || 1;
                const shareRatio = basePrice / subtotal;
                const finalPrice = basePrice + (fees * shareRatio);

                totalSpent += finalPrice;

                return {
                    itemId: item.id,
                    itemName: item.name,
                    receiptName: item.receipt.name,
                    receiptId: item.receipt.id,
                    basePrice,
                    finalPrice,
                    assignedAt: as.createdAt,
                };
            });

            return {
                user,
                stats: {
                    totalSpent: Number(totalSpent.toFixed(2)),
                    totalPaid: Number(totalPaid.toFixed(2)),
                    balance: Number((totalSpent - totalPaid).toFixed(2)),
                },
                history: {
                    payments: payments.map(p => ({
                        id: p.id,
                        amount: p.amount,
                        receiptName: p.receipt.name,
                        receiptId: p.receiptId,
                        date: p.createdAt,
                    })),
                    items: itemHistory,
                },
            };
        } catch (error) {
            console.error('Profile Error:', error);
            throw new Error(`Profile Error: ${error.message}`);
        }
    }
}
