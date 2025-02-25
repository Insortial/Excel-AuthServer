import { Router } from "express";
import { Request, Response } from "express";
import authenticateToken from "../middleware/authenticateToken";
import validateParamsAsNum from "../middleware/validateParamsAsNum";
import bcrypt from "bcrypt";
import { sqlRequest } from "../hooks/sqlRequest";

export const userRequests = Router();

/**
 * Retrieves all users and their role assignments
 * @returns {Array<Object>} List of users with their roles
 * @throws {AppError} When database query fails
 */
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

/**
 * Updates user roles
 * @param {Object} roleData - Updated role assignments
 * @returns {Object} Update confirmation
 * @throws {AppError} When role update fails
 */
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

/**
 * Removes user from system
 * @param {number} id - User ID to delete
 * @returns {Object} Deletion confirmation
 * @throws {AppError} When user deletion fails
 */
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

/**
 * Retrieves specific user details
 * @param {number} id - User ID to retrieve
 * @returns {Object} User details
 * @throws {AppError} When user not found
 */
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

/**
 * Updates user details
 * @param {number} id - User ID to update
 * @param {Object} userData - Updated user details
 * @returns {Object} Update confirmation
 * @throws {AppError} When update fails
 */
userRequests.put('/:id', authenticateToken, validateParamsAsNum(), async (req: Request, res: Response) => {
    const { id } = req.params
    const { email, firstName, lastName, phone, password } = req.body

    try {
        // First check if user exists
        const checkUserQuery = `SELECT COUNT(*) as count FROM [Users] WHERE [userID] = ?`
        const userExists = await sqlRequest(checkUserQuery, [id])
        
        if (userExists[0].count === 0) {
            return res.status(500).json({
                success: false,
                message: "User cannot be found"
            })
        }

        // Hash password if provided
        let hashedPassword: string | undefined
        if(password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt)
        }

        const updateUserQuery = `UPDATE [Users]
                                 SET [email] = ?, [firstName] = ?, [lastName] = ?, [phone] = ? ${password ? ", [password] = ?" : ""}
                                 WHERE [userID] = ?`

        await sqlRequest(updateUserQuery, [email, firstName, lastName, phone, ...(password ? [hashedPassword] : []), id])

        res.status(200).json({
            success: true,
            message: "User updated successfully"
        })
    } catch(err) {
        console.error("Error updating user:", err)
        res.status(500).json({
            success: false,
            message: "Failed to update user"
        })
    }
})

/**
 * Creates new user account
 * @param {Object} userData - User details and role assignments
 * @returns {Object} Creation confirmation
 * @throws {AppError} When user creation fails
 */
userRequests.post("/", authenticateToken, async (req: Request, res: Response) => {
    // ... existing code ...
})