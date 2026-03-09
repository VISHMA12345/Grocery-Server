import cron from "node-cron";
import { AppDataSource } from "../data-source";
import { User } from "../entity/Users";
import { NotificationService } from "../services/notification.service";

export class notificationCron {
    private notificationService = new NotificationService();

    weeklyNotification() {
        // 🔥 Runs every Monday at 9:00 AM
        cron.schedule("0 9 * * MON", async () => {
            console.log("🔔 Running Weekly Grocery Suggestion Cron");

            const userRepo = AppDataSource.getMongoRepository(User);
            const users = await userRepo.find();

            for (const user of users) {
                await this.notificationService.triggerSmartSuggestions(user.id);
                await this.notificationService.triggerWeeklyReminder(user.id);
            }

            console.log("✅ Notification cron completed");
        });
    }
}