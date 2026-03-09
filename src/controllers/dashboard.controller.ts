// import { handleErrorResponse, response } from "../utils";
// import { AppDataSource } from "../data-source";
// import { GroceryBucket } from "../entity/GroceryBucket";
// import { Category } from "../entity/Category";
// import { ObjectId } from "mongodb";
// import { AuthMiddleware, AuthPayload } from "../middlewares/AuthMiddleware";
// import { Get, JsonController, Req, Res, UseBefore } from "routing-controllers";
// import { Product } from "../entity/Product";
// interface RequestWithUser extends Request {
//     user: AuthPayload;
// }
// @UseBefore(AuthMiddleware)
// @JsonController("/dashboard")
// export class DashboardController {
//     private bucketRepo = AppDataSource.getMongoRepository(GroceryBucket);
//     private categoryRepo = AppDataSource.getMongoRepository(Category);
//     private productRepo = AppDataSource.getMongoRepository(Product);
//     @Get("/dashboard")
//     async getDashboard(
//         @Req() req: RequestWithUser,
//         @Res() res: Response
//     ) {
//         try {
//             const userId = new ObjectId(req.user.userId);

//             // ================
//             // 1️⃣ Fetch Active Bucket
//             // ================
//             const bucket = await this.bucketRepo.findOne({
//                 where: { userId, isDelete: 0, isActive: 1 }
//             });

//             if (!bucket) {
//                 return response(res, 200, "Dashboard", {
//                     totalItems: 0,
//                     totalCost: 0,
//                     categoriesCount: 0,
//                     completedCount: 0,
//                     recentlyAdded: [],
//                     categorySummary: []
//                 });
//             }

//             // ================
//             // 2️⃣ Top Cards
//             // ================
//             const totalItems = bucket.items.length;
//             const totalCost = bucket.items.reduce((sum, i) => sum + i.total, 0);
//             const completedCount = bucket.items.filter(i => i.isActive === 0).length;

//             // Categories Count (from categories collection)
//             const categoriesCount = await this.categoryRepo.count({
//                 where: { isDelete: 0 }
//             });

//             // ================
//             // 3️⃣ Recently Added (last 5)
//             // ================
//             // ================================
//             // 3️⃣ RECENTLY ADDED (with product lookup)
//             // ================================
//             const lastItems = bucket.items.slice(-5).reverse();

//             // Collect productIds from bucket items
//             const productIds = lastItems.map(i => i.productId);

//             // Fetch products from DB
//             const products = await this.productRepo.find({
//                 where: {
//                     _id: { $in: productIds }
//                 }
//             });

//             // Convert to map for fast lookup
//             const productMap = new Map(
//                 products.map(p => [p.id.toString(), p])
//             );

//             // Final merged output
//             const recentlyAdded = lastItems.map(i => {
//                 const product: any = productMap.get(i.productId.toString());
//                 return {
//                     name: product?.name,   // get name from product model
//                     image: product?.images?.[0]?.path || null,
//                     quantity: i.quantity,
//                     unit: i.unit,
//                     total: i.total,
//                     createdAt: bucket.createdAt
//                 };
//             });
//             // ================
//             // 4️⃣ Category Summary
//             // ================
//             const categories = await this.categoryRepo.find({
//                 where: { isDelete: 0 }
//             });

//             const categorySummary = categories.map(cat => {
//                 const count = bucket.items.filter(i => i.categoryId?.toString() === cat.id.toString()).length;

//                 return {
//                     categoryId: cat.id,
//                     name: cat.name,
//                     icon: cat.icon,
//                     itemCount: count
//                 };
//             });

//             return response(res, 200, "Dashboard Data Fetched", {
//                 totalItems,
//                 totalCost,
//                 categoriesCount,
//                 completedCount,
//                 recentlyAdded,
//                 categorySummary
//             });

//         } catch (error) {
//             return handleErrorResponse(error, res);
//         }
//     }
// }
