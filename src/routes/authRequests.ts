import { Router } from "express";
import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sqlRequest } from "../hooks/sqlRequest";

export const authRequests = Router();


function generateAccessToken(payload: {[key:string]: any}) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "30m"});
}

authRequests.post("/token", async (req: Request, res: Response) => {
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

authRequests.post("/register", async (req: Request, res: Response) => {
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

authRequests.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body
    console.log(email)
    if(!email || !password) {
        res.status(401).json({
            message: "Please fill out all fields",
            success: false
        })
        return
    }

    const retrieveUserIDAndPass = `SELECT password, userID, firstName + ' ' + lastName as fullName, phone FROM Users WHERE email = ?`

    const result = (await sqlRequest(retrieveUserIDAndPass, [email]))[0]
    
    if(result == null)
        return res.status(401).json({message: "User not found", success: false})

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


authRequests.delete("/logout", async (req: Request, res: Response) => {
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