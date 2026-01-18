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
        items: { name: string; price: number; quantity: number }[];
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
                    create: data.items,
                },
            },
            include: {
                items: true,
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
}
