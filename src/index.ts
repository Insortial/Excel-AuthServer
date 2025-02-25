import dotenv from "dotenv"
import express, { Express, Request, Response } from "express";
/* const schedule = require('node-schedule'); */
import cors from "cors";
import cookieParser from "cookie-parser"
import { authRequests } from "./routes/authRequests";
import { userRequests } from "./routes/userRequests";
import { roleRequests } from "./routes/roleRequests";


dotenv.config()

const app: Express = express();
const port = 4000;

//Middlewares
app.use(cors({
    credentials: true,
    origin: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/', authRequests)
app.use('/user', userRequests)
app.use('/role', roleRequests)

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app;