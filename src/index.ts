import express from "express";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");
import cors from "cors";
import { useExpressServer } from "routing-controllers";
import { AppDataSource } from "./data-source";
import fileUpload from "express-fileupload";
import { notificationCron } from "./cron/notification";

AppDataSource.initialize()
  .then(async () => {

    console.log(`✅ Database connected: ${AppDataSource.options.database}`);
    // Cron job
    if (process.env.ENABLE_CRON === "true") {
      new notificationCron().weeklyNotification();
    }

    const app = express();
    const allowedOrigins = [
      "https://grocery-server-1-16fr.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:3001",
    ];

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost")) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Origin", "Content-Type", "Authorization", "Accept"],
        credentials: true
      })
    );

    app.use(
      fileUpload({
        limits: { fileSize: 10 * 1024 * 1024 },
        abortOnLimit: true,
        useTempFiles: false
      })
    );
    app.use("/public", express.static("public"));

    const isProd = process.env.NODE_ENV === "prod";

    useExpressServer(app, {
      routePrefix: "/api",
      controllers: [
        isProd
          ? __dirname + "/controllers/**/*.js"
          : __dirname + "/controllers/**/*.ts"
      ],
      middlewares: [
        isProd
          ? __dirname + "/middlewares/**/*.js"
          : __dirname + "/middlewares/**/*.ts"
      ],
      defaultErrorHandler: false,
      validation: true,
      classTransformer: true,
    });

    app.get("/", (_req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: AppDataSource.isInitialized ? "connected" : "disconnected",
        nodeVersion: process.version,
        uptime: process.uptime()
      });
    });

    app.use((err, _req, res, _next) => {
      console.error(err);
      res.status(err.httpCode || 500).json({
        message: err.message,
        errors: err.errors || null
      });
    });

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  })
  .catch((error) => {
    console.error("❌ DB Error:", error);
  });
