import { Router } from "express";
import { Request, Response } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { sqlRequest } from "../hooks/sqlRequest";

export const roleRequests = Router();

roleRequests.get('/', authenticateToken, async (req: Request, res: Response) => {
    const getRolesQuery = `SELECT * FROM Roles`
    try {
        const rows = await sqlRequest(getRolesQuery) 
        res.status(200).json({
            success: true,
            response: rows
        })
     } catch(err) {
         console.log(err)
         res.status(500).json({
             success: false, 
             message: 'Unable to obtain roles'
         })
     }
})