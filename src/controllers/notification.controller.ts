import { JsonController, Get, Req, Res, UseBefore, Patch, Param } from "routing-controllers";
import { Response } from "express";
import { AppDataSource } from "../data-source";
import { Notification } from "../entity/Notifications";
import { ObjectId } from "mongodb";
import { handleErrorResponse, response } from "../utils";
import { AuthMiddleware, AuthPayload } from "../middlewares/AuthMiddleware";
interface RequestWithUser extends Request {
    user: AuthPayload;
}
@UseBefore(AuthMiddleware)
@JsonController("/notifications")
export class NotificationController {

    private notificationRepo = AppDataSource.getMongoRepository(Notification);

    @Get("/")
    async getNotifications(@Req() req: RequestWithUser, @Res() res: Response) {
        try {
            const userId = new ObjectId(req.user.userId);

            const notifications = await this.notificationRepo.find({
                where: { userId },
                order: { createdAt: "DESC" }
            });

            return response(res, 200, "Notifications fetched successfully", notifications);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Get("/:id")
    async getNotification(@Param("id") id: string, @Res() res: Response) {
        try {
            const notification = await this.notificationRepo.findOne({
                where: { _id: new ObjectId(id) }
            });

            if (!notification) {
                return response(res, 404, "Notification not found");
            }

            return response(res, 200, "Notification fetched successfully", notification);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Patch("/:id")
    async markAsRead(@Param("id") id: string, @Res() res: Response) {
        try {
            const notification = await this.notificationRepo.findOne({
                where: { _id: new ObjectId(id) }
            });

            if (!notification) {
                return response(res, 404, "Notification not found");
            }

            notification.isRead = true;
            await this.notificationRepo.save(notification);

            return response(res, 200, "Notification marked as read");

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

}