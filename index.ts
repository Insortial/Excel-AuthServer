import dotenv from "dotenv"
import express, { Express, Request, Response } from "express";
/* const schedule = require('node-schedule'); */
import bcrypt from "bcrypt";
import cors from "cors";
import * as jwt from "jsonwebtoken"
import sql from "msnodesqlv8"
import cookieParser from "cookie-parser"
import authenticateToken from "./middleware/authenticateToken"


dotenv.config()

const app: Express = express();
const port = process.env.PORT || 3000;

//Middlewares
app.use(cors({
    credentials: true,
    origin: true
}));

app.use(express.json());
app.use(cookieParser());

app.post("/token", async (req: Request, res: Response) => {
    console.log(req.cookies)
    const cookies = req.cookies
    if (!cookies?.jwt) return res.sendStatus(401);

    try {
        const refreshToken = cookies.jwt;
        const deleteRefreshToken = "DELETE FROM RefreshTokens WHERE token = ? AND dateCreated < DATEADD(day, -7, GETDATE());"
        await sqlRequest(deleteRefreshToken, [refreshToken])
        const selectRefreshToken = "SELECT userIDFK FROM RefreshTokens WHERE token = ?;"
        const token = await sqlRequest(selectRefreshToken, [refreshToken])
        if(token.length === 0) return res.sendStatus(403)
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string, (err: any, user: any) => {
            const accessToken = generateAccessToken({
                email: user.email, 
                name: user.name,
                phone: user.phone,
                roles: user.roles
            });
            res.status(200).json({
                accessToken: accessToken,
                success: true
            });
        })
    } catch(error) {
        console.log(error)
        res.status(400).json({
            message: error,
            success: false
        })
    }
})

const sqlRequest = async (sqlQuery:string, parameters:any[] = []):Promise<{[key:string]:any}[]> => {
    try {
        const rows:{[key:string]:any}[] = await new Promise((resolve, reject) => {
            sql.query(process.env.CONNECTION_STRING as string, sqlQuery, parameters, (err: any, rows: any) => {
                if(err) {
                    reject(err)
                } else {
                    resolve(rows)
                }
            });
        })
        return rows
    } catch(error) {
        console.log(error)
        throw error
    }
}

app.post("/register", async (req: Request, res: Response) => {
    const { email, firstName, lastName, password, phone } = req.body;
    
    try {
        const salt = await bcrypt.genSalt(10);
        if (!salt) throw Error("Failed to generate salt.");
        const hashedPassword = await bcrypt.hash(password === "" ? "password" : password, salt);
        console.log(hashedPassword);
        if (!hashedPassword) throw Error("Failed to hash password.");
        const findUserRoleQuery = "SELECT roleID FROM Roles WHERE roleName = 'USER'"
        const createUser = `INSERT INTO Users OUTPUT inserted.userID VALUES (?, ?, ?, ?, ?);`
        const setDefaultRole = `INSERT INTO UsersToRoles (roleIDFK, userIDFK) VALUES (?, ?);`
        const userRoleID = (await sqlRequest(findUserRoleQuery))[0].roleID
        const userID = (await sqlRequest(createUser, [email, firstName, lastName, hashedPassword, phone].map((item) => item === "" ? null : item)))[0].userID
        sqlRequest(setDefaultRole, [userRoleID, userID])
        console.log(userRoleID)
        console.log(userID)
       /*  const payload = {
            email: email
        }

        const accessToken = generateAccessToken(payload);
        const refreshToken =  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "7d"})
        const insertRefreshToken = "INSERT INTO RefreshTokens (userIDFK, token) VALUES (?, ?)"
        await sqlRequest(insertRefreshToken, [userID, refreshToken]).catch(err => {
            console.log(err)
            res.status(401).json({
                success: false, 
                message: 'Refresh token insert failed'
            });
        })
        res.cookie('jwt', refreshToken, {httpOnly: true, maxAge: 24 * 60 * 60 * 1000})
        res.status(200).json({
            accessToken: accessToken,
            success: true
        }); */

        res.status(200).json({
            success: true
        })
    } catch(error) {
        console.log(error)
        res.status(400).json({
            message: error,
            success: false
        })
    }
});

app.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body

    if(email == "" || password == "") {
        res.status(401).json({
            message: "Please fill out all fields",
            success: false
        })
        return
    }

    const retrieveUserIDAndPass = `SELECT password, userID, firstName + ' ' + lastName as fullName, phone FROM Users WHERE email = ?`

    const result = (await sqlRequest(retrieveUserIDAndPass, [email]))[0]
    console.log(result)
    const userPassword = result.password
    const userID = result.userID
    const fullName = result.fullName
    const phone = result.phone

    
    
    bcrypt.compare(password, userPassword, async (err, isValid) => {
        if(err) {
            res.status(400).json({
                message: err.message,
                success: false
            })
        }

        if (isValid) {
            const getUserRoles = "SELECT roleName FROM UsersToRoles AS UR INNER JOIN ROLES AS R ON R.roleID = UR.roleIDFK WHERE userIDFK = ?"
            const roles = (await sqlRequest(getUserRoles, [userID]))
            console.log(roles.map(role => role.roleName))
            const payload = {
                email: email,
                name: fullName,
                phone: phone,
                roles: roles.map(role => role.roleName)
            }
        
            const accessToken = generateAccessToken(payload);
            const refreshToken =  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "1d"})
            const insertRefreshToken = "INSERT INTO RefreshTokens (userIDFK, token) VALUES (?, ?)"

            await sqlRequest(insertRefreshToken, [userID, refreshToken]).catch(err => {
                console.log(err)
                res.status(401).json({
                    success: false, 
                    message: 'Refresh token insert failed'
                });
            })
            res.cookie('jwt', refreshToken, {httpOnly: true, maxAge: 24 * 60 * 60 * 1000})
            res.status(200).json({
                accessToken: accessToken,
                success: true
            });
        } else {
            res.status(401).json({
                success: false, 
                message: 'passwords do not match'
            });
        }
    })
})

app.delete("/deleteUser/:id", authenticateToken, async (req: Request, res: Response) => {
    let id = req.params.id;
    let parsedID = -1
    console.log(id)

    if (!isNaN(Number(id))) {
        parsedID  = parseInt(id, 10); 
    } else {
        res.status(400).send('Invalid parameter');
    }

    try {
        await sqlRequest(`EXECUTE delete_user ${parsedID}`, [])
        res.status(200).json({
            status: "Delete successfully executed"
        })
    } catch(err) {
        console.error("User delete was not successfully completed")
        res.status(500).send()
    }
})


app.delete("/logout", async (req: Request, res: Response) => {
    console.log(req.headers.cookie)
    const cookies = req.cookies
    if (!cookies?.jwt) return res.sendStatus(401);

    try {
        const refreshToken = cookies.jwt;
        const deleteRefreshToken = "DELETE FROM RefreshTokens WHERE token = ?;"
        await sqlRequest(deleteRefreshToken, [refreshToken])
        res.status(200).json({
            message: "Token successfully deleted",
            success: true
        })
    } catch(error) {
        console.log(error)
        res.status(400).json({
            message: error,
            success: false
        })
    }
})

app.get('/getUserRoles', authenticateToken, async (req: Request, res: Response) => {
    const getUserRolesQuery = `SELECT userID, firstName, lastName, roleName
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
                    name: `${row.firstName} ${row.lastName}`,
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

app.get('/getRoles', authenticateToken, async (req: Request, res: Response) => {
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

app.post('/changeRole', authenticateToken, async (req: Request, res: Response) => {
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

function generateAccessToken(payload: {[key:string]: any}) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "25m"});
}

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});