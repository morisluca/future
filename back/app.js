import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
const app = express();
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      }
    }
  })
);
const rawOrigin = process.env["ALLOWED_ORIGIN"];
const corsOrigin = rawOrigin ? rawOrigin === "*" ? true : rawOrigin.split(",").map((o) => o.trim()) : true;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
var app_default = app;
export {
  app_default as default
};
//# sourceMappingURL=app.js.map
