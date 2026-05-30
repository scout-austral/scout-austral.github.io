import request from 'supertest'
import { mockReset, DeepMockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { createApp } from '../app'
import { signToken } from '../lib/jwt'
import prisma from '../lib/prisma'

jest.mock('../lib/prisma')
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}))
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?test=1'),
    getToken: jest.fn().mockResolvedValue({
      tokens: { access_token: 'access-token', refresh_token: 'refresh-token' },
    }),
    setCredentials: jest.fn(),
  })),
}))
jest.mock('googleapis', () => ({
  google: {
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: { id: 'google-123', email: 'google@test.com', name: 'Google User' },
        }),
      },
    }),
  },
}))

const prismaMock = prisma as DeepMockProxy<PrismaClient>
const bcrypt = require('bcryptjs')
const app = createApp()

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  googleId: null,
  googleAccessToken: null,
  googleRefreshToken: null,
  calendarAccessToken: null,
  calendarRefreshToken: null,
  calendarConnected: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  mockReset(prismaMock)
})

describe('POST /auth/register', () => {
  it('creates user and returns token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(mockUser)

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@test.com', password: 'password123', name: 'Test User' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('test@test.com')
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('returns 409 if email already registered', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@test.com', password: 'password123' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Email already in use')
  })

  it('returns 400 if missing password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@test.com' })

    expect(res.status).toBe(400)
  })

  it('returns 400 if missing email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'password123' })

    expect(res.status).toBe(400)
  })
})

describe('POST /auth/login', () => {
  it('returns token on valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('returns 401 on wrong password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    bcrypt.compare.mockResolvedValue(false)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' })

    expect(res.status).toBe(401)
  })

  it('returns 401 if user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' })

    expect(res.status).toBe(401)
  })

  it('returns 401 for google-only account (no password)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password123' })

    expect(res.status).toBe(401)
  })

  it('returns 400 if missing fields', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@test.com' })

    expect(res.status).toBe(400)
  })
})

describe('GET /auth/me', () => {
  it('returns user with valid token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    const token = signToken('user-1')

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('test@test.com')
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-valid-token')
    expect(res.status).toBe(401)
  })

  it('returns 401 if user no longer exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const token = signToken('deleted-user-id')

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
  })
})

describe('GET /auth/google', () => {
  it('redirects to Google OAuth consent screen', async () => {
    const res = await request(app).get('/auth/google')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('accounts.google.com')
  })
})

describe('GET /auth/google/callback', () => {
  it('redirects to frontend with JWT on success', async () => {
    prismaMock.user.upsert.mockResolvedValue({
      ...mockUser,
      email: 'google@test.com',
      passwordHash: null,
      googleId: 'google-123',
      googleAccessToken: 'access-token',
      googleRefreshToken: 'refresh-token',
    })

    const res = await request(app).get('/auth/google/callback?code=test-code')

    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('token=')
    expect(res.headers.location).toContain('localhost:5173')
  })

  it('redirects to frontend with error when code is missing', async () => {
    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('auth_error=missing_code')
  })
})
