import { Request, Response, NextFunction } from "express";

const validateParamsAsNum = (...numberParams:string[]) => {
    return (req: Request, res: Response, next:NextFunction) => {
        let params = []
        console.log(req.params)
        if(numberParams.length === 0)
            params = Object.keys(req.params)
        else 
            params = numberParams

        for (const param of params) {
            const value = req.params[param]

            if (!isNaN(Number(value))) {
                (req.params as any)[param] = +value
            } else {
                return res.status(400).send('Invalid Parameter')
            }
        }
        next()
    }
}

export default validateParamsAsNum;