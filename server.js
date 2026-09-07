import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRouter from "./routes/auth.routes.js";
import { standardRateLimit } from "./middlewares/limiters.js";

const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(standardRateLimit);

app.use("/api" , authRouter)

app.listen(PORT , () => console.log(`SERVER HAS STARTED ON PORT ${PORT}`));