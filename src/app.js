import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));  // helps accept json data
app.use(express.urlencoded({ extended: true, limit: "16kb" }))  // parses url
app.use(express.static("public")); // storring publically
app.use(cookieParser()) // to access and cookies from user's browser

// routes import
import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter);

// https://localhost:8000/api/v1/users/register
export { app };