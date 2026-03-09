import {
    JsonController,
    Post,
    Body,
    Req,
    Res,
    HttpCode,

} from "routing-controllers";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import requestIp from "request-ip";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";

import { AppDataSource } from "../data-source";

import { LoginHistory } from "../entity/LoginHistory";
import response from "../utils/response";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt";

import { UserToken } from "../entity/UserToken";
import { User } from "../entity/Users";
import { AuthPayload } from "../middlewares/AuthMiddleware";

const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any
};

@JsonController("/auth")
export class AuthController {

    private userRepo = AppDataSource.getMongoRepository(User);
    private loginHistoryRepo =
        AppDataSource.getMongoRepository(LoginHistory);

    @Post("/login")
    @HttpCode(StatusCodes.OK)
    async login(
        @Body() body: any,
        @Req() req: Request,
        @Res() res: Response
    ) {
        try {
            const { email, password } = body;

            if (!email) {
                return response(
                    res,
                    StatusCodes.BAD_REQUEST,
                    "email is required"
                );
            }
            if (!password) {
                return response(
                    res,
                    StatusCodes.BAD_REQUEST,
                    "password is required"
                );
            }

            const user = (await this.userRepo.findOne({
                where: { email, isDelete: 0 }
            }))

            if (!user) {
                return response(res, StatusCodes.UNAUTHORIZED, "Invalid email");
            }

            if (user.isActive !== 1) {
                return response(res, StatusCodes.FORBIDDEN, "Account is inactive. Please contact admin.");
            }

            // 2️⃣ Validate PIN
            const validPin = await bcrypt.compare(password, user.password);
            if (!validPin) {
                return response(res, StatusCodes.UNAUTHORIZED, "Invalid Password");
            }

            // 3️⃣ IP Address
            const ipAddress =
                requestIp.getClientIp(req) || "UNKNOWN";

            // 4️⃣ UA Parser (TS SAFE)
            const parser = new UAParser(req.headers["user-agent"] as string);
            const ua = parser.getResult();

            // 5️⃣ Device Name (Physical device)
            let deviceName = "Unknown Device";

            if (ua.device.vendor && ua.device.model) {
                deviceName = `${ua.device.vendor} ${ua.device.model}`; // Android
            } else if (ua.os.name === "iOS") {
                deviceName = "Apple iPhone"; // iOS privacy
            } else if (ua.os.name) {
                deviceName = ua.os.name; // Desktop
            }

            // 6️⃣ Browser / App Name
            const clientType = req.headers["x-client-type"];
            const platform = req.headers["x-platform"];

            let browserName = "Unknown";

            if (clientType === "MOBILE_APP") {
                browserName =
                    platform === "IOS" ? "iOS App" : "Android App";
            } else {
                browserName = ua.browser.name
                    ? `${ua.browser.name}${ua.browser.version ? " " + ua.browser.version : ""}`
                    : "Unknown Browser";
            }

            // 7️⃣ Location
            const geo = geoip.lookup(ipAddress);
            const currentLocation = geo
                ? `${geo.city || ""}, ${geo.region || ""}, ${geo.country || ""}`
                : "Unknown";

            let payload: any;

            payload = {
                id: user.id.toString(),
                email: user.email,
                userType: "USER"
            };

            await this.loginHistoryRepo.save({
                userId: user.id,
                userType: payload.userType,
                userName: user.name,
                phoneNumber: user.phoneNumber,
                deviceName,
                browserName,
                currentLocation,
                ipAddress,
                loginfrom: "WEB",
                status: "SUCCESS",
                loginAt: new Date()
            });

            // 🔟 Sign JWT
            const token = jwt.sign(payload, JWT_SECRET, options);

            // Update token in separate collection (UserToken)
            const tokenRepo = AppDataSource.getMongoRepository(UserToken);
            await tokenRepo.deleteMany({ userId: user.id }); // Clear old tokens
            await tokenRepo.save({
                userId: user.id,
                userType: payload.userType as any,
                token
            });

            // ✅ Response
            return response(res, StatusCodes.OK, "Login successful", {
                token,
                userType: payload.userType,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {
            console.error(error);
            return response(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                "Login failed"
            );
        }
    }

}
