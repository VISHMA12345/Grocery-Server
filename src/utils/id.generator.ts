
// import { AppDataSource } from "../data-source";
// import { User } from "../entity/Users";

// export async function generateAdminUserId(): Promise<string> {
//     try {
//         const lastAdminUser = await AppDataSource.getMongoRepository(User).findOne({
//             where: {},
//             order: { createdAt: "DESC" as any }
//         });

//         const lastId = lastAdminUser?.?.replace('US', '') || '000';
//         const numeric = parseInt(lastId) || 0;
//         const newId = `US${(numeric + 1).toString().padStart(3, '0')}`;
//         return newId;
//     } catch (err) {
//         throw err;
//     }
// }


