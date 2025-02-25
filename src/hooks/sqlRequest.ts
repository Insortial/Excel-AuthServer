const sql = require("msnodesqlv8")

/**
 * Executes SQL query
 * @param {string} sqlQuery - SQL query to execute
 * @param {Array} parameters - Query parameters
 * @returns {Promise<Object[]>} Query results
 * @throws {Error} When query fails
 */
export const sqlRequest = async (sqlQuery: string, parameters: any[] = []): Promise<{[key: string]: any}[]> => {
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