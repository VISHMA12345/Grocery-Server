import { Body, Delete, Get, JsonController, Param, Patch, Post, QueryParams, Req, Res } from "routing-controllers";
import { handleErrorResponse, pagination, response } from "../utils";
import { AppDataSource } from "../data-source";
import { Product } from "../entity/Product";
import { AddItemToBucketDto } from "../dto/GroceryBucket.dto";
import { GroceryBucket } from "../entity/GroceryBucket";
import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../middlewares/AuthMiddleware";
import { UseBefore } from "routing-controllers";
interface RequestWithUser extends Request {
    user: AuthPayload;
}
@UseBefore(AuthMiddleware)
@JsonController("/groceries")

export class GroceryController {
    private productRepo = AppDataSource.getMongoRepository(Product);
    private bucketRepo = AppDataSource.getMongoRepository(GroceryBucket);
    @Post("/")
    async createGroceryList(
        @Body() body: AddItemToBucketDto,
        @Res() res: Response,
        @Req() req: RequestWithUser
    ) {
        try {
           console.log(body,'details---------------------------');


            const userId = new ObjectId(req.user.userId);

            const items = body.items.map(i => ({
                productId: new ObjectId(i.productId),
                quantity: i.quantity,
                unit: i.unit,
                assignedTo: i.assignedTo == null || i.assignedTo == "" ? userId : new ObjectId(i.assignedTo),  
                isCompleted: 0
            }));

            if (items.length === 0) {
                return response(res, 400, "No items provided");
            }


            const list = new GroceryBucket();

            list.userId = userId;
            list.listName = body.listName;
            list.storeName = body.storeName;
            list.items = items;
            list.isActive = 1;
            list.isDelete = 0;
            list.status = "pending";


            const saved = await this.bucketRepo.save(list);

            return response(res, 200, "Grocery list created", saved);

        } catch (error) {
           console.log(error,'details---------------------------');

            return handleErrorResponse(error, res);
        }
    }
    @Get("/")
    async getList(
        @Res() res: Response,
        @Req() req: RequestWithUser,
        @QueryParams() query: any
    ) {
        try {

            const userId = new ObjectId(req.user.userId);

            const converted =
                query.converted === "true"
                    ? true
                    : query.converted === "false"
                        ? false
                        : undefined;

            const match: any = {
                isDelete: 0,
                $or: [
                    { userId: userId },      // creator
                    { partnerId: userId }    // partner
                ]
            };

            if (converted !== undefined) {
                match.converted_to_basket = converted;
            }

            if (query.completed === "true") {
                match.completedStatus = true;
            }
            if (query.canceled === "true") {
                match.isDelete = 1;
            }
            const list = await this.bucketRepo.aggregate([

                { $match: match },

                {
                    $lookup: {
                        from: "products",
                        localField: "items.productId",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },

                {
                    $addFields: {
                        itemCount: { $size: "$items" }
                    }
                },

                {
                    $project: {
                        listName: 1,
                        storeName: 1,
                        itemCount: 1,
                        createdAt: 1,
                        productDetails: 1
                    }
                },

                {
                    $sort: { createdAt: -1 }
                }

            ]).toArray();

            return response(res, 200, "List fetched successfully", list);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Get("/:listId")
    async getListDetail(
        @Param("listId") listId: string,
        @Res() res: Response
    ) {
        try {

            const list = await this.bucketRepo.aggregate([
            {
                $match: {
                    _id:new ObjectId(listId)
                }
            },

            {
                $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "createdUser"
                }
            },

            {
                $unwind: "$items"
            },

            {
                $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product"
                }
            },

            {
                $lookup: {
                from: "users",
                localField: "items.assignedTo",
                foreignField: "_id",
                as: "assignedUser"
                }
            },

            {
                $addFields: {
                "items.product": { $arrayElemAt: ["$product", 0] },
                "items.assignedUser": { $arrayElemAt: ["$assignedUser", 0] }
                }
            },

            {
                $project: {
                product: 0,
                assignedUser: 0
                }
            },

            {
                $group: {
                _id: "$_id",
                userId: { $first: "$userId" },
                listName: { $first: "$listName" },
                storeName: { $first: "$storeName" },
                items: { $push: "$items" },
                createdUser: { $first: "$createdUser" },
                isActive: { $first: "$isActive" },
                isDelete: { $first: "$isDelete" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                converted_to_basket: { $first: "$converted_to_basket" }
                }
            }
            ]).toArray();

            if (!list.length) {
                return response(res, 404, "Grocery list not found");
            }

            return response(res, 200, "List fetched successfully", list[0]);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Patch("/:listId")
    async updateGroceryList(
        @Param("listId") listId: string,
        @Body() body: AddItemToBucketDto,
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

            if (body.listName) bucket.listName = body.listName;
            if (body.storeName) bucket.storeName = body.storeName;

            if (body.items) {

                bucket.items = body.items.map(i => ({
                    productId: new ObjectId(i.productId),
                    quantity: i.quantity,
                    unit: i.unit,
                    assignedTo:i.assignedTo == "" ? new ObjectId(req.user.userId) :new ObjectId(i.assignedTo),
                    isCompleted: 0
                }));

            }

            bucket.userId = new ObjectId(req.user.userId);

            const updated = await this.bucketRepo.save(bucket);

            return response(res, 200, "Grocery list updated successfully", updated);

        } catch (error) {
            console.log(error);
            return handleErrorResponse(error, res)
        }
    }
    @Delete("/:listId")
    async deleteList(
        @Param("listId") listId: string,
        @Res() res: Response
    ) {
        try {

            const bucket = await this.bucketRepo.findOne({
                where: { _id: new ObjectId(listId), isDelete: 0 }
            });

            if (!bucket) {
                return response(res, 404, "List not found");
            }

            bucket.isDelete = 1;

            await this.bucketRepo.save(bucket);

            return response(res, 200, "Grocery list deleted successfully");

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Patch("/convert/:listId")
    async convertToBucket(
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

            bucket.converted_to_basket = true;
            bucket.userId = new ObjectId(req.user.userId);

            const updated = await this.bucketRepo.save(bucket);

            return response(res, 200, "Grocery list converted to basket successfully", updated);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }


      @Get("/activeList/:status")
async getActiveList(
    @Param("status") status: string,
    @Req() req: RequestWithUser,
    @Res() res: Response
) {
    try {

        const userId = new ObjectId(req.user.userId);

        const list = await this.bucketRepo.aggregate([

            {
                $match: {
                    isDelete: 0,
                    status: status
                }
            },

            // break items array
            {
                $unwind: "$items"
            },

            // check assignedTo matches logged user
            {
                $match: {
                    "items.assignedTo": userId
                }
            },

            // populate product
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            {
                $unwind: {
                    path: "$product",
                    preserveNullAndEmptyArrays: true
                }
            },

            // attach product inside items
            {
                $addFields: {
                    "items.product": "$product"
                }
            },

            // regroup items back
            {
                $group: {
                    _id: "$_id",
                    userId: { $first: "$userId" },
                    partnerId: { $first: "$partnerId" },
                    listName: { $first: "$listName" },
                    storeName: { $first: "$storeName" },
                    status: { $first: "$status" },
                    items: { $push: "$items" },
                    createdAt: { $first: "$createdAt" }
                }
            }

        ]).toArray();

    

        return response(res, 200, "Assigned lists fetched successfully", list ?? []);

    } catch (error) {
        return handleErrorResponse(error, res);
    }
}

}
