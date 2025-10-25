import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { MongoDBConnect } from "./config/MongoDB.js";
import authRoute from "./route/authRoute.js";
import searchRoute from "./route/donorRoute.js";
import errorHandler from "./middleware/errorHandler.js";
import cors from "cors";
 
// initialize app
const app = express();

// Config dotenv
dotenv.config();

// environment var
const PORT = process.env.PORT || 8080;
   
// Set middlewares                
app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(cookieParser());

// ✅ CORS Allow Setup
app.use(cors({
    origin : process.env.CLIENT_URL,
    credentials : true, // allow cookies to be sent
    methods : ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders : ["Content-Type", "Authorization"]
}))
    
// static folder
app.use(express.static("public"));


// routing
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/find", searchRoute);

// error handler function
app.use(errorHandler);

// app listen server
app.listen(PORT, () =>{
    console.log(`Server is running on PORT ${PORT}`.bgGreen.white);
    
    // mongoDb connection
    MongoDBConnect();
    
});