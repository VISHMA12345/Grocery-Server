import { AppDataSource } from "../data-source";
import { Notification } from "../entity/Notifications";
import { Product } from "../entity/Product";
import { ObjectId } from "mongodb";
import { dueForPurchase, isWeeklyPattern } from "../utils/notification.helper";

export class NotificationService {

    private productRepo = AppDataSource.getMongoRepository(Product);
    private notificationRepo = AppDataSource.getMongoRepository(Notification);

    // 🔥  Smart Suggestion (frequent items)
    async triggerSmartSuggestions(userId: ObjectId) {
        const frequentlyBought = await this.productRepo.aggregate([
            { $match: { isDelete: 0, userId } },
            { $group: { _id: "$name", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
        ]).toArray();

        for (const item of frequentlyBought) {
            await this.notificationRepo.save({
                userId,
                title: "Smart Suggestion",
                message: `You often buy ${item._id}. Want to add it again?`,
            });
        }
    }

    // 🔥 Weekly Pattern Suggestions (Bread, Milk, Eggs etc.)
    async triggerWeeklyReminder(userId: ObjectId) {
        const history = await this.productRepo.find({
            where: { userId, isDelete: 0 },
            order: { createdAt: "DESC" }
        });

        // Group by item name
        const grouped: Record<string, Date[]> = {};
        for (const item of history) {
            if (!grouped[item.name]) grouped[item.name] = [];
            grouped[item.name].push(item.createdAt);
        }

        // Process each item
        for (const name in grouped) {
            const dates = grouped[name];
            const lastPurchase = dates[0];

            if (isWeeklyPattern(dates) && dueForPurchase(lastPurchase)) {
                await this.notificationRepo.save({
                    userId,
                    title: "Weekly Reminder",
                    message: `You usually buy ${name} every week. Want to add it now?`
                });
            }
        }
    }
}