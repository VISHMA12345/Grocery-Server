import { Body, Get, JsonController, Param, Patch, Post, Req, Res, UseBefore } from "routing-controllers";
import { AuthMiddleware, AuthPayload } from "../middlewares/AuthMiddleware";
import { ObjectId } from "mongodb";
import { handleErrorResponse, response } from "../utils";
import { AppDataSource } from "../data-source";
import { UserPartner } from "../entity/UserPartner";
interface RequestWithUser extends Request {
    user: AuthPayload;
}
@UseBefore(AuthMiddleware)
@JsonController("/partners")

export class UserPartnersController {
    @Post("/")
    async raisePartnerRequest(
        @Body() body: any,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {

            const userId = new ObjectId(req.user.userId);
            const partnerId = new ObjectId(body.partnerId);

            if (userId.equals(partnerId)) {
                return response(res, 400, "You cannot send request to yourself");
            }

            const existing = await AppDataSource
                .getMongoRepository(UserPartner)
                .findOne({
                    where: {
                        $or: [
                            { userId, partnerId },
                            { userId: partnerId, partnerId: userId }
                        ],
                        isDelete: 0
                    }
                });

            if (existing) {
                return response(res, 400, "Partner request already exists");
            }

            const partner = new UserPartner();

            partner.userId = userId;
            partner.partnerId = partnerId;
            partner.status = "pending";
            partner.isActive = 1;
            partner.isDelete = 0;

            await AppDataSource.getMongoRepository(UserPartner).save(partner);

            return response(res, 200, "Partner request sent");

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Get("/")
    async partnerDetails(
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {

            const userId = new ObjectId(req.user.userId);

            const partner = await AppDataSource
                .getMongoRepository(UserPartner)
                .aggregate([

                    {
                        $match: {
                            $or: [
                                { userId },
                                { partnerId: userId }
                            ],
                            isDelete: 0
                        }
                    },

                    {
                        $lookup: {
                            from: "users",
                            let: { partnerId: "$partnerId", userId: "$userId" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $or: [
                                                { $eq: ["$_id", "$$partnerId"] },
                                                { $eq: ["$_id", "$$userId"] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "users"
                        }
                    }

                ])
                .toArray();

            return response(res, 200, "Partner details fetched", partner);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Patch("/status/:requestId")
    async updateRequestStatus(
        @Param("requestId") requestId: string,
        @Body() body: any,
        @Res() res: Response
    ) {
        try {

            const request = await AppDataSource
                .getMongoRepository(UserPartner)
                .findOne({
                    where: {
                        _id: new ObjectId(requestId),
                        isDelete: 0
                    }
                });

            if (!request) {
                return response(res, 404, "Request not found");
            }

            request.status = body.status;

            await AppDataSource.getMongoRepository(UserPartner).save(request);

            return response(res, 200, "Partner request status updated");

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}