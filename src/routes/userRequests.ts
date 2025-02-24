import { Router } from "express";
import { Request, Response } from "express";
import authenticateToken from "../middleware/authenticateToken";
import validateParamsAsNum from "../middleware/validateParamsAsNum";
import { sqlRequest } from "../hooks/sqlRequest";

export const userRequests = Router();


userRequests.get('/roles', authenticateToken, async (req: Request, res: Response) => {
    const getUserRolesQuery = `SELECT userID, firstName, lastName, email, phone, roleName
                                FROM USERS AS U
                                LEFT JOIN UsersToRoles AS UR ON U.userID = UR.userIDFK
                                LEFT JOIN Roles AS R ON R.roleID = UR.roleIDFK`
    const getRoleNamesQuery = `SELECT roleName FROM Roles`
    
    try {
        const roleObject:{[key:string]:boolean} = {}
        const rows = await sqlRequest(getUserRolesQuery) 
        const roles = (await sqlRequest(getRoleNamesQuery)).forEach(role => roleObject[role.roleName] = false)
        console.log(roleObject)
        const merged:any = {}
        rows.map((row) => {
            const userID = row.userID

            if(merged[userID] !== undefined) {
                if (row.roleName in roleObject)
                    merged[userID].roles[row.roleName] = true
            } else {
                merged[userID] = {
                    userID: userID,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email: row.email,
                    phone: row.phone,
                    roles: row.roleName in roleObject ? {...roleObject,
                        [row.roleName]: true
                    } : roleObject
                }
            }
        })

        res.status(200).json({
            success: true,
            response: Object.values(merged)
        })
     } catch(err) {
         console.log(err)
         res.status(500).json({
             success: false, 
             message: 'Merge failed'
         })
     }
})

userRequests.put('/roles', authenticateToken, async (req: Request, res: Response) => {
    console.log(req.body.newValues)
    try {
        for (const user of req.body.newValues) {
            const { userID, roles } = user;
            const changeRoleQuery = `MERGE INTO UsersToRoles AS target
                            USING (
                                SELECT u.userID, r.roleID
                                FROM Users u
                                JOIN Roles r ON r.roleName IN (${roles.map((role:string) => `'${role}'`).join(', ')})
                                WHERE u.userID = ${userID}
                            ) AS source (userID, roleID)
                            ON target.userIDFK = source.userID AND target.roleIDFK = source.roleID
                            WHEN NOT MATCHED BY TARGET THEN
                                INSERT (userIDFK, roleIDFK) 
                                VALUES (source.userID, source.roleID)
                            WHEN NOT MATCHED BY SOURCE AND target.userIDFK = (
                                SELECT userID 
                                FROM Users 
                                WHERE userID = ${userID}
                            ) THEN
                                DELETE;`

            sqlRequest(changeRoleQuery)
        } 
        res.status(200).json({
            success: true
        })
    } catch(err) {
        console.log(err)
        res.status(500).json({
            success: false, 
            message: 'Merge failed'
        })
    }
})


userRequests.delete("/:id", authenticateToken, validateParamsAsNum(),  async (req: Request, res: Response) => {
    const { id } = req.params
    try {
        await sqlRequest(`EXECUTE delete_user ${id}`, [])
        res.status(200).json({
            status: "Delete successfully executed"
        })
    } catch(err) {
        console.error("User delete was not successfully completed")
        res.status(500).send()
    }
})

userRequests.get('/:id', authenticateToken, validateParamsAsNum(), async (req: Request, res: Response) => {
    const { id } = req.params

    try {
        const retrieveUserQuery = `SELECT * FROM [Users] WHERE userID = ?`

        const response = await sqlRequest(retrieveUserQuery, [id])
        
        if(response.length < 1)
            res.status(500).send("User cannot be found")

        res.status(200).json(response[0])
    } catch(err) {
        console.error("User cannot be found")
        res.status(500).send("User cannot be found")
    }
})

userRequests.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params
    const {  } = req.body

    try {

    } catch(err) {

    }
})