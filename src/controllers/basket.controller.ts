import { JsonController, Param, Patch, Req, Res } from "routing-controllers";
import { AppDataSource } from "../data-source";
import { GroceryBucket } from "../entity/GroceryBucket";
import { Product } from "../entity/Product";

import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../middlewares/AuthMiddleware";
import { UseBefore } from "routing-controllers";
import { Response, Request } from "express";
import { handleErrorResponse, response } from "../utils";
interface RequestWithUser extends Request {
    user: AuthPayload;
}
@UseBefore(AuthMiddleware)
@JsonController("/basket")
export class BasketController {
    private bucketRepo = AppDataSource.getMongoRepository(GroceryBucket);
    @Patch("/complete-all/:listId")
    async GroceryListComplete(
        @Param("listId") listId: string,
        @Res() res: Response,
        @Req() req: RequestWithUser
    ) {
        try {

            const bucket = await this.bucketRepo.findOne({
                where: {
                    _id: new ObjectId(listId),
                    isDelete: 0
                }
            });

            if (!bucket) {
                return response(res, 404, "Grocery list not found");
            }

            bucket.completedStatus = true;
            bucket.userId = new ObjectId(req.user.userId);

            const updated = await this.bucketRepo.save(bucket);

            return response(res, 200, "Grocery list marked as completed", updated);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Patch("/item/complete/:listId/:productId")
    async completeItem(
        @Param("listId") listId: string,
        @Param("productId") productId: string,
        @Res() res: Response
    ) {
        try {

            const result = await this.bucketRepo.updateOne(
                {
                    _id: new ObjectId(listId),
                    "items.productId": new ObjectId(productId)
                },
                {
                    $set: {
                        "items.$.isCompleted": 1
                    }
                }
            );

            if (!result.modifiedCount) {
                return response(res, 404, "Item not found");
            }

            return response(res, 200, "Item marked as completed");

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
     @Patch("/cancel/:listId")
    async cancelGroceryList(
        @Param("listId") listId: string,
        @Res() res: Response,
        @Req() req: RequestWithUser
    ) {
        try {

            const bucket = await this.bucketRepo.findOne({
                where: {
                    _id: new ObjectId(listId),
                    isDelete: 0
                }
            });

            if (!bucket) {
                return response(res, 404, "Grocery list not found");
            }

            bucket.isDelete = 1;
            bucket.userId = new ObjectId(req.user.userId);

            const updated = await this.bucketRepo.save(bucket);

            return response(res, 200, "Grocery list marked as cancelled", updated);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}