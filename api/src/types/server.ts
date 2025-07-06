import { Express } from 'express'
import { Server } from 'http'

export interface AppConfig {
  port: number
  cors: {
    origin: string[]
    credentials: boolean
  }
  rateLimit: {
    windowMs: number
    max: number
    message: string
  }
}

export interface ServerManager {
  app: Express
  server: Server | null
  config: AppConfig
  start(): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
  getPort(): number
}

export interface AppFactory {
  createApp(config?: Partial<AppConfig>): Express
  createDefaultConfig(): AppConfig
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
}