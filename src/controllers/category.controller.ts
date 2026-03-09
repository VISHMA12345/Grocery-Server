import {
    JsonController,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Res,
    Req,
    HttpCode,
    QueryParams,
    UseBefore
} from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AppDataSource } from "../data-source";
import { Category } from "../entity/Category";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/Category.dto";
import { handleErrorResponse, pagination, response } from "../utils";

@JsonController("/categories")
export class CategoryController {
    private categoryRepo = AppDataSource.getMongoRepository(Category);

    // =========================================================
    // CREATE CATEGORY
    // =========================================================
    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateCategoryDto,
        @Res() res: Response,
    ) {
        try {
            const exists = await this.categoryRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });

            if (exists) {
                return response(res, StatusCodes.CONFLICT, "Category already exists");
            }

            const category = new Category();
            category.name = body.name;
            category.description = body.description ?? "";
            category.icon = body.icon ?? "";
            category.isActive = body.isActive ?? 1;
            category.isDelete = 0;

            const saved = await this.categoryRepo.save(category);

            return response(res, StatusCodes.CREATED, "Category created successfully", saved);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    // =========================================================
    // LIST WITH PAGINATION + SEARCH
    // =========================================================
    @Get("/")
    async list(
        @QueryParams() query: any,
        @Res() res: Response
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.max(Number(query.limit) || 10, 1);
            const search = query.search?.toString();

            const match: any = { isDelete: 0 };

            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } }
                ];
            }

            const pipeline: any[] = [
                { $match: match },

                // 🔥 COUNT PRODUCTS FOR EACH CATEGORY
                {
                    $lookup: {
                        from: "products",
                        let: { categoryId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$categoryId", "$$categoryId"] },
                                    isDelete: 0
                                }
                            },
                            { $count: "count" }
                        ],
                        as: "productCount"
                    }
                },

                // 🔥 ALWAYS RETURN 0 IF NO ITEMS
                {
                    $addFields: {
                        itemCount: {
                            $ifNull: [{ $arrayElemAt: ["$productCount.count", 0] }, 0]
                        }
                    }
                },

                { $project: { productCount: 0, isDelete: 0 } },

                { $sort: { createdAt: -1 } },

                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.categoryRepo.aggregate(pipeline).toArray();
            const data = result?.data || [];
            const total = result?.meta?.[0]?.total || 0;

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    // =========================================================
    // GET ONE CATEGORY
    // =========================================================
    @Get("/:id")
    async getOne(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            const pipeline: any[] = [
                { $match: { _id: new ObjectId(id), isDelete: 0 } },
                {
                    $project: {
                        isDelete: 0
                    }
                }
            ];

            const [result] = await this.categoryRepo.aggregate(pipeline).toArray();

            if (!result) {
                return response(res, StatusCodes.NOT_FOUND, "Category not found");
            }

            return response(res, StatusCodes.OK, "Category fetched successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    // =========================================================
    // UPDATE CATEGORY
    // =========================================================
    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateCategoryDto,
        @Res() res: Response
    ) {
        try {
            const category = await this.categoryRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!category) {
                return response(res, StatusCodes.NOT_FOUND, "Category not found");
            }

            if (body.name !== undefined) category.name = body.name;
            if (body.description !== undefined) category.description = body.description;
            if (body.icon !== undefined) category.icon = body.icon ?? "";
            if (body.isActive !== undefined) category.isActive = body.isActive;

            await this.categoryRepo.save(category);

            return response(res, StatusCodes.OK, "Category updated successfully", category);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    // =========================================================
    // DELETE CATEGORY (SOFT DELETE)
    // =========================================================
    @Delete("/:id")
    async delete(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            const category = await this.categoryRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!category) {
                return response(res, StatusCodes.NOT_FOUND, "Category not found");
            }

            category.isDelete = 1;
            await this.categoryRepo.save(category);

            return response(res, StatusCodes.OK, "Category deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}