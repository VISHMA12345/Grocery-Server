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
    QueryParams
} from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AppDataSource } from "../data-source";
import { Product } from "../entity/Product";
import { CreateProductDto, UpdateProductDto } from "../dto/Product.dto";
import { handleErrorResponse, pagination, response } from "../utils";

@JsonController("/products")
export class ProductController {
    private productRepo = AppDataSource.getMongoRepository(Product);


    // =====================================================
    // CREATE PRODUCT
    // =====================================================
    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateProductDto,
        @Res() res: Response
    ) {
        try {
            const product = new Product();
            product.name = body.name;
            product.description = body.description;
            product.categoryId = new ObjectId(body.categoryId);
            // product.images = body.images;
            product.price = body.price;
            // product.mrp = body.mrp;
            product.qty = body.qty;
            product.isActive = body.isActive ?? 1;
            product.isDelete = 0;
            product.unit = body.unit;
            const saved = await this.productRepo.save(product);

            return response(res, StatusCodes.CREATED, "Product created successfully", saved);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    // =====================================================
    // LIST PRODUCTS WITH PAGINATION + SEARCH + CATEGORY JOIN
    // =====================================================
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

            if (query.categoryId) {
                match.categoryId = new ObjectId(query.categoryId);
            }

            if (query.status === "active") match.isActive = 1;
            else if (query.status === "inactive") match.isActive = 0;

            const pipeline: any[] = [
                { $match: match },
                {
                    $lookup: {
                        from: "categories",
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        isDelete: 0
                    }
                },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.productRepo.aggregate(pipeline).toArray();
            const data = result?.data || [];
            const total = result?.meta?.[0]?.total || 0;

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    // =====================================================
    // UPDATE PRODUCT
    // =====================================================
    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateProductDto,
        @Res() res: Response
    ) {
        try {
            const product = await this.productRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!product) {
                return response(res, StatusCodes.NOT_FOUND, "Product not found");
            }

            if (body.name !== undefined) product.name = body.name;
            if (body.description !== undefined) product.description = body.description;
            if (body.price !== undefined) product.price = body.price;
            if (body.isActive !== undefined) product.isActive = body.isActive;
            if (body.categoryId !== undefined) {
                product.categoryId = new ObjectId(body.categoryId);
            }
            if (body.unit !== undefined) product.unit = body.unit;
            if (body.qty
                 !== undefined) product.qty = body.qty  ;

            await this.productRepo.save(product);

            return response(res, StatusCodes.OK, "Product updated successfully", product);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    // =====================================================
    // DELETE PRODUCT (SOFT DELETE)
    // =====================================================
    @Delete("/:id")
    async delete(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            const product = await this.productRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!product) {
                return response(res, StatusCodes.NOT_FOUND, "Product not found");
            }

            product.isDelete = 1;
            await this.productRepo.save(product);

            return response(res, StatusCodes.OK, "Product deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    @Get("/product-list")
    async listProducts(
        @QueryParams() query: any,
        @Res() res: Response
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.max(Number(query.limit) || 10, 1);

            const status = query.status || "all";  // all | active | completed

            const match: any = { isDelete: 0 };

            // 🔥 Status Filter
            if (status === "active") match.isActive = 1;
            if (status === "completed") match.isActive = 0;

            // 🔥 Search Filter
            if (query.search) {
                match.name = { $regex: query.search, $options: "i" };
            }

            // 🔥 Unit Filter
            if (query.unit) {
                match.unit = query.unit;
            }

            // 🔥 Category Filter
            if (query.categoryId) {
                match.categoryId = new ObjectId(query.categoryId);
            }

            // 🔥 Aggregation Pipeline
            const pipeline: any[] = [
                { $match: match },

                {
                    $lookup: {
                        from: "categories",
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

                {
                    $project: {
                        name: 1,
                        description: 1,
                        unit: 1,
                        quantity: 1,
                        price: 1,
                        mrp: 1,
                        stock: 1,
                        images: 1,
                        isActive: 1,
                        categoryName: "$category.name",
                        categoryImage: "$category.image",
                        total: { $multiply: ["$price", "$quantity"] },
                        createdAt: 1,
                    }
                },

                { $sort: { createdAt: -1 } },

                {
                    $facet: {
                        data: [
                            { $skip: page * limit },
                            { $limit: limit }
                        ],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.productRepo.aggregate(pipeline).toArray();

            const items = result?.data || [];
            const total = result?.meta?.[0]?.total || 0;

            pagination(total, items, limit, page, res);

        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
    // =====================================================
    // GET ONE PRODUCT
    // =====================================================
    @Get("/:id")
    async getOne(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            const pipeline: any[] = [
                { $match: { _id: new ObjectId(id), isDelete: 0 } },
                {
                    $lookup: {
                        from: "categories",
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        isDelete: 0
                    }
                }
            ];

            const [product] = await this.productRepo.aggregate(pipeline).toArray();

            if (!product) {
                return response(res, StatusCodes.NOT_FOUND, "Product not found");
            }

            return response(res, StatusCodes.OK, "Product fetched successfully", product);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}