// require('dotenv').config({ path: './env' })
import dotenv from "dotenv"
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("Error!!!", error)
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log("MONGODB connection failed!!!", err);
    })




























/*  1st approach  


import express from "express"
const app = express();

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("error:", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log("Server running on port:", process.env.PORT);
        })
    } catch (error) {
        console.log("ERROR:", error);
        throw error;
    }
})()
    */