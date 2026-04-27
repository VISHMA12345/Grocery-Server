import express from "express";
import cron from "node-cron";
import dns from "dns";
import cors from "cors";
import { useExpressServer } from "routing-controllers";
import { AppDataSource } from "./data-source";
import fileUpload from "express-fileupload";
import { notificationCron } from "./cron/notification";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

AppDataSource.initialize()
  .then(async () => {
    console.log(`✅ Database connected: ${AppDataSource.options.database}`);

    const app = express();

    // 1. CRITICAL: Comprehensive CORS Configuration
    const allowedOrigins = [
      "https://groceryhelpert.netlify.app",
      "https://grocery-server-1-16fr.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:3001",
    ];

    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl)
          if (!origin) return callback(null, true);

          // Remove trailing slash for comparison
          const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;

          const isAllowed = allowedOrigins.includes(normalizedOrigin) ||
            normalizedOrigin.startsWith("http://localhost");

          if (isAllowed) {
            callback(null, true);
          } else {
            console.error(`🚫 CORS Blocked origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
          }
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
        credentials: true,
        optionsSuccessStatus: 200 // Some legacy browsers choke on 204
      })
    );

    // 2. Cron job Initialization
    if (process.env.ENABLE_CRON === "true") {
      console.log("⏳ Notification cron will start in 3 minutes...");
      setTimeout(() => {
        console.log("🔔 Initializing Notification Cron...");
        new notificationCron().weeklyNotification();
      }, 3 * 60 * 1000);
    }

    // 3. Other Middlewares
    // Routing Controllers will handle JSON parsing by default via @Body()
    app.use(
      fileUpload({
        limits: { fileSize: 10 * 1024 * 1024 },
        abortOnLimit: true,
        useTempFiles: false
      })
    );
    app.use("/public", express.static("public"));

    const isProd = process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production";

    // 4. Routing Controllers Setup
    useExpressServer(app, {
      routePrefix: "/api",
      controllers: [
        isProd ? __dirname + "/controllers/**/*.js" : __dirname + "/controllers/**/*.ts"
      ],
      middlewares: [
        isProd ? __dirname + "/middlewares/**/*.js" : __dirname + "/middlewares/**/*.ts"
      ],
      defaultErrorHandler: false,
      validation: true,
      classTransformer: true,
      cors: false, // We already handled CORS above manually
    });

    // Health Check Routes
    app.get("/", (_req, res) => {
      res.status(200).json({
        status: "ok",
        database: AppDataSource.isInitialized ? "connected" : "disconnected",
      });
    });

    app.get("/active-api", (req, res) => {
      res.status(200).json({ message: "API is active" });
    });

    // Error Handler
    app.use((err, _req, res, _next) => {
      const status = err.httpCode || err.status || 500;
      res.status(status).json({
        message: err.message || "Internal Server Error",
        errors: err.errors || null
      });
    });

    // 5. Keep-Alive Cron (Self-Ping)
    cron.schedule("*/10 * * * *", () => {
      console.log("📡 Pinging server...");
      fetch("https://grocery-server-1-16fr.onrender.com/active-api")
        .then(() => console.log("✅ Ping Success"))
        .catch((err) => console.error("❌ Ping Fail", err));
    });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  })
  .catch((error) => {
    console.error("❌ DB Error:", error);
  });