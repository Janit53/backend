import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import { DB_NAME } from "../constant.js";

configDotenv();

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        // console.log(connectionInstance)
        console.log(`\n MOngoDB connected!! DB host ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection error:", error);
        process.exit(1); // read about this - process.exit()
    }
}

export default connectDB
