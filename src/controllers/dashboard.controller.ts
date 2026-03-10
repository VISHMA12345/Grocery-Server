import { handleErrorResponse, response } from "../utils";
import { AppDataSource } from "../data-source";
import { GroceryBucket } from "../entity/GroceryBucket";
import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../middlewares/AuthMiddleware";
import { Get, JsonController, Req, Res, UseBefore } from "routing-controllers";
interface RequestWithUser extends Request {
    user: AuthPayload;
}
@UseBefore(AuthMiddleware)
@JsonController("/dashboard")
export class DashboardController {
    private bucketRepo = AppDataSource.getMongoRepository(GroceryBucket);
    @Get("/dashboard")
    async getDashboard(
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {

            const userId = new ObjectId(req.user.userId);
            const totalActiveCount = await this.bucketRepo.count({
                where: {
                    $or: [
                        { userId: userId },      // creator
                        { partnerId: userId }    // partner
                    ],
                    isDelete: 0,
                    completedStatus: false
                }
            });
            const completedCount = await this.bucketRepo.count({
                where: {
                    $or: [
                        { userId: userId },      // creator
                        { partnerId: userId }    // partner
                    ],
                    isDelete: 0,
                    completedStatus: true
                }
            });
            const canceledCount = await this.bucketRepo.count({
                where: {
                    $or: [
                        { userId: userId },      // creator
                        { partnerId: userId }    // partner
                    ],
                    isDelete: 1,
                }
            });
            return response(res, 200, "Dashboard data retrieved", {
                totalActiveCount,
                completedCount,
                canceledCount
            });
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
