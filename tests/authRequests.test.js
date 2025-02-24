import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/index-test'
let cookies;

describe('POST /login', () => {
    it('should return refresh token if credentials are valid', async () => {
        const loginObj = {
            email: "renq@excelcabinetsinc.com",
            password: "password9902"
        }
        
        const response = await request(app).post('/login')
            .send(loginObj)

        expect(response.status).toBe(200)
        cookies = response.headers["set-cookie"];
    
        expect(cookies).toBeDefined();
        expect(cookies.some(cookie => cookie.includes("HttpOnly"))).toBe(true);
    })
})

describe('POST /token', () => {
    it('should return access token', async () => {
        const response = await request(app).post('/token')
            .set("Cookie", cookies)

        expect(response.status).toBe(200)
        expect(typeof response.body.accessToken).toBe('string')
    })

    it('should return error status if cookie is invalid', async () => {
        const response = await request(app).post('/token')
            .set("Cookie", "jwt=wrongcookieexample")

        expect(response.status).toBe(403)
    })
})

describe('POST /logout', () => {
    it('should return success status if valid cookie', async () => {
        const response = await request(app).delete('/logout')
            .set("Cookie", cookies)

        expect(response.status).toBe(200)
    })

    it('should return failed status if cookie is not present', async () => {
        const response = await request(app).delete('/logout')

        expect(response.status).toBe(401)
    })
})