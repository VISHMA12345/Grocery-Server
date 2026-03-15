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
    @Req() req: RequestWithUser,
  ) {
    try {
      const result = await this.bucketRepo.updateOne(
        {
          _id: new ObjectId(listId),
          isDelete: 0,
        },
        {
          $set: {
            status: "completed",
            "items.$[].isCompleted": 1, // ✅ mark all items completed
            completedStatus: true,
            userId: new ObjectId(req.user.userId),
            completedAt: new Date(),
          },
        },
      );

      if (!result.matchedCount) {
        return response(res, 404, "Grocery list not found");
      }

      return response(res, 200, "All items marked as completed");
    } catch (error) {
      return handleErrorResponse(error, res);
    }
  }

  @Patch("/item/complete/:listId/:productId")
  async completeItem(
    @Param("listId") listId: string,
    @Param("productId") productId: string,
    @Res() res: Response,
  ) {
    try {
      const listObjectId = new ObjectId(listId);
      const productObjectId = new ObjectId(productId);

      // 1️⃣ Mark item as completed
      const result = await this.bucketRepo.updateOne(
        {
          _id: listObjectId,
          "items.productId": productObjectId,
        },
        {
          $set: {
            "items.$.isCompleted": 1,
          },
        },
      );

      if (!result.modifiedCount) {
        return response(res, 404, "Item not found");
      }

      // 2️⃣ Check if any item is still not completed
      const pendingItem =await this.bucketRepo.findOne({
        where: {
            _id: new ObjectId(listObjectId),
          "items.isCompleted": 0,
        },
      });
      // 3️⃣ If no pending items → mark grocery as completed
      if (!pendingItem) {
        await this.bucketRepo.updateOne(
          { _id: listObjectId },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
            },
          },
        );
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
    @Req() req: RequestWithUser,
  ) {
    try {
      const bucket = await this.bucketRepo.findOne({
        where: {
          _id: new ObjectId(listId),
          isDelete: 0,
        },
      });

      if (!bucket) {
        return response(res, 404, "Grocery list not found");
      }

      bucket.status = "cancelled";
      bucket.userId = new ObjectId(req.user.userId);

      const updated = await this.bucketRepo.save(bucket);

      return response(res, 200, "Grocery list marked as cancelled", updated);
    } catch (error) {   
      return handleErrorResponse(error, res);
    }
  }
}
