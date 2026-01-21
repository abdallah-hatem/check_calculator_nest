import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Receipt, Item, Assignment, Payment, Prisma } from '@prisma/client';

@Injectable()
export class ReceiptRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        name?: string;
        subtotal: number;
        delivery: number;
        tax: number;
        service: number;
        total: number;
        creatorId: string;
        items: { 
            name: string; 
            price: number; 
            quantity: number;
            assignments?: { friendId?: string; userId?: string }[];
        }[];
        payments?: { amount: number; friendId?: string; userId?: string }[];
    }): Promise<Receipt & { items: Item[] }> {
        return this.prisma.receipt.create({
            data: {
                name: data.name,
                subtotal: data.subtotal,
                delivery: data.delivery,
                tax: data.tax,
                service: data.service,
                total: data.total,
                creatorId: data.creatorId,
                items: {
                    create: data.items.map(item => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        assignments: item.assignments ? {
                            create: item.assignments.map(a => {
                                console.log(`Creating assignment: userId=${a.userId}, friendId=${a.friendId}`);
                                return {
                                    friendId: a.friendId,
                                    userId: a.userId,
                                };
                            }),
                        } : undefined,
                    })),
                },
                payments: data.payments ? {
                    create: data.payments.map(p => {
                        console.log(`Creating payment: userId=${p.userId}, friendId=${p.friendId}, amount=${p.amount}`);
                        return {
                            amount: p.amount,
                            friendId: p.friendId,
                            userId: p.userId,
                        };
                    }),
                } : undefined,
            },
            include: {
                items: {
                    include: {
                        assignments: true,
                    },
                },
                payments: true,
            },
        });
    }

    async findByUserId(userId: string) {
        return this.prisma.receipt.findMany({
            where: { creatorId: userId },
            include: {
                items: true,
            },
        });
    }

    async findById(id: string) {
        return this.prisma.receipt.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        assignments: {
                            include: {
                                user: { select: { id: true, name: true } },
                                friend: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
                payments: {
                    include: {
                        user: { select: { id: true, name: true } },
                        friend: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }

    async assignItem(itemId: string, userId?: string, friendId?: string) {
        return this.prisma.assignment.create({
            data: {
                itemId,
                userId,
                friendId,
            },
        });
    }

    async unassignItem(assignmentId: string) {
        return this.prisma.assignment.delete({
            where: { id: assignmentId },
        });
    }

    async addPayment(receiptId: string, amount: number, userId?: string, friendId?: string) {
        return this.prisma.payment.create({
            data: {
                receiptId,
                amount,
                userId,
                friendId,
            },
        });
    }

    async getUserStats(userId: string) {
        console.log(`Fetching stats for user: ${userId}`);
        // 1. Get all payments made by the user
        const payments = await this.prisma.payment.findMany({
            where: { userId },
            select: { amount: true, createdAt: true },
        });
        console.log(`Found ${payments.length} payments`);

        // 2. Get all item assignments for the user to calculate "ordered" amount
        const assignments = await this.prisma.assignment.findMany({
            where: { userId },
            include: {
                item: {
                    include: {
                        assignments: true, // to know how many people shared it
                    }
                }
            }
        });
        console.log(`Found ${assignments.length} assignments`);

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        let totalOrdered = 0;
        const itemCounts: Record<string, number> = {};

        assignments.forEach(as => {
            const share = as.item.price / as.item.assignments.length;
            totalOrdered += share;
            
            const name = as.item.name;
            itemCounts[name] = (itemCounts[name] || 0) + 1;
        });

        // 3. Group by period (simple monthly for now)
        const monthlyStats: Record<string, { paid: number, ordered: number }> = {};
        
        payments.forEach(p => {
            const month = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyStats[month]) monthlyStats[month] = { paid: 0, ordered: 0 };
            monthlyStats[month].paid += p.amount;
        });

        assignments.forEach(as => {
            const month = as.createdAt.toISOString().slice(0, 7);
            if (!monthlyStats[month]) monthlyStats[month] = { paid: 0, ordered: 0 };
            const share = as.item.price / as.item.assignments.length;
            monthlyStats[month].ordered += share;
        });

        return {
            totalPaid,
            totalOrdered,
            itemCounts: Object.entries(itemCounts).map(([name, count]) => ({ name, count })),
            monthlyStats: Object.entries(monthlyStats).map(([month, data]) => ({
                month,
                ...data
            })).sort((a, b) => b.month.localeCompare(a.month)),
        };
    }
}
