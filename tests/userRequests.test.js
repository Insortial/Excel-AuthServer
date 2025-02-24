import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/index-test'

let token;

beforeAll(async () => {
    const response = await request(app)
      .post('/login') // Auth route for generating token
      .send({ email: 'renq@excelcabinetsinc.com', password: 'password9902' });
    
    token = response.body.accessToken; // Assume the response contains the token
});


describe('GET /roles', () => {
    it('should return roles for all users in database', async () => {
        const response = await request(app).get('/user/roles').set('Authorization', `Bearer ${token}`)
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.response)).toBe(true);

        response.body.response.forEach(user => {
            expect(user.userID).toBeTypeOf("number");
            expect(user.firstName).toBeTypeOf("string");
            expect(user.lastName).toBeTypeOf("string");
            expect(user.email).toBeOneOf([null, expect.any(String)]); // Basic email validation
            expect(user.phone).toBeOneOf([null, expect.any(String)]); // Allow phone to be a string or null
            expect(user.roles).toBeTypeOf("object");
        });
    })
})

describe('GET /user/:id', () => {
    it('should return user info given valid userID', async () => {
        const userID = 1
        const response = await request(app).get(`/user/${userID}`).set('Authorization', `Bearer ${token}`)
      
        expect(response.status).toBe(200)
        expect(response.body.userID).toBe(userID)
    })

    it('should return error given invalid userID', async () => {
        const userID = 1023012301
        const response = await request(app).get(`/user/${userID}`).set('Authorization', `Bearer ${token}`)

        expect(response.status).toBe(500)
    })
})

describe('PUT /user/:id', () => {
    it('should update user info to provided userID', async () => {

    })

    it('should return error if provided userID is incorrect', async () => {
        
    })
})