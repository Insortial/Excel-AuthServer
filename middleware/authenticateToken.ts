import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv"
import * as jwt from "jsonwebtoken"

dotenv.config()

function authenticateToken(req: Request, res: Response, next:NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err:any, user: any) => {
        if (err) return res.sendStatus(401)
        console.log("Verified")
        
        //req.user = user;
        next()
    })
}
export default authenticateToken;