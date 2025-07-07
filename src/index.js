import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import MemoryManagementService from './services/MemoryManagementService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Company Memory System - Main Entry Point
 * Provides REST API for vector database memory operations
 */
class MemorySystemAPI {
  constructor() {
    this.app = express();
    this.memoryService = new MemoryManagementService();
    this.logger = this.setupLogger();
    this.port = process.env.API_PORT || 3000;
  }

  /**
   * Initialize the memory system API
   */
  async initialize() {
    try {
      this.logger.info('Starting AI Company Memory System...');
      
      // Initialize memory service
      await this.memoryService.initialize();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Start server
      await this.startServer();
      
      this.logger.info('AI Company Memory System started successfully');
    } catch (error) {
      this.logger.error('Failed to start Memory System:', error);
      process.exit(1);
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method === 'POST' ? req.body : undefined
      });
      next();
    });

    // Error handling
    this.app.use((err, req, res, next) => {
      this.logger.error('API Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'AI Company Memory System',
        version: '1.0.0'
      });
    });

    // Store experience memory
    this.app.post('/api/memory/experience', async (req, res) => {
      try {
        const { employeeId, content, context, metadata } = req.body;
        
        if (!employeeId || !content) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, content'
          });
        }

        const memoryId = await this.memoryService.storeExperienceMemory(
          employeeId,
          content,
          context || {},
          metadata || {}
        );

        res.json({
          success: true,
          memoryId: memoryId,
          employeeId: employeeId,
          type: 'experience'
        });
      } catch (error) {
        this.logger.error('Error storing experience memory:', error);
        res.status(500).json({
          error: 'Failed to store experience memory',
          message: error.message
        });
      }
    });

    // Store knowledge memory
    this.app.post('/api/memory/knowledge', async (req, res) => {
      try {
        const { employeeId, content, context, metadata } = req.body;
        
        if (!employeeId || !content) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, content'
          });
        }

        const memoryId = await this.memoryService.storeKnowledgeMemory(
          employeeId,
          content,
          context || {},
          metadata || {}
        );

        res.json({
          success: true,
          memoryId: memoryId,
          employeeId: employeeId,
          type: 'knowledge'
        });
      } catch (error) {
        this.logger.error('Error storing knowledge memory:', error);
        res.status(500).json({
          error: 'Failed to store knowledge memory',
          message: error.message
        });
      }
    });

    // Store decision memory
    this.app.post('/api/memory/decision', async (req, res) => {
      try {
        const { employeeId, content, context, metadata } = req.body;
        
        if (!employeeId || !content) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, content'
          });
        }

        const memoryId = await this.memoryService.storeDecisionMemory(
          employeeId,
          content,
          context || {},
          metadata || {}
        );

        res.json({
          success: true,
          memoryId: memoryId,
          employeeId: employeeId,
          type: 'decision'
        });
      } catch (error) {
        this.logger.error('Error storing decision memory:', error);
        res.status(500).json({
          error: 'Failed to store decision memory',
          message: error.message
        });
      }
    });

    // Search memories
    this.app.post('/api/memory/search', async (req, res) => {
      try {
        const { employeeId, query, options } = req.body;
        
        if (!employeeId || !query) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, query'
          });
        }

        const results = await this.memoryService.searchMemories(
          employeeId,
          query,
          options || {}
        );

        res.json({
          success: true,
          employeeId: employeeId,
          query: query,
          results: results,
          total: results.length
        });
      } catch (error) {
        this.logger.error('Error searching memories:', error);
        res.status(500).json({
          error: 'Failed to search memories',
          message: error.message
        });
      }
    });

    // Get relevant context for task
    this.app.post('/api/memory/context', async (req, res) => {
      try {
        const { employeeId, taskDescription, options } = req.body;
        
        if (!employeeId || !taskDescription) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, taskDescription'
          });
        }

        const context = await this.memoryService.getRelevantContext(
          employeeId,
          taskDescription,
          options || {}
        );

        res.json({
          success: true,
          employeeId: employeeId,
          taskDescription: taskDescription,
          context: context
        });
      } catch (error) {
        this.logger.error('Error getting relevant context:', error);
        res.status(500).json({
          error: 'Failed to get relevant context',
          message: error.message
        });
      }
    });

    // Get employee expertise
    this.app.get('/api/memory/expertise/:employeeId/:domain', async (req, res) => {
      try {
        const { employeeId, domain } = req.params;
        
        const expertise = await this.memoryService.getEmployeeExpertise(
          employeeId,
          domain
        );

        res.json({
          success: true,
          expertise: expertise
        });
      } catch (error) {
        this.logger.error('Error getting employee expertise:', error);
        res.status(500).json({
          error: 'Failed to get employee expertise',
          message: error.message
        });
      }
    });

    // Get memory statistics
    this.app.get('/api/memory/stats/:employeeId', async (req, res) => {
      try {
        const { employeeId } = req.params;
        
        const stats = await this.memoryService.getMemoryStatistics(employeeId);

        res.json({
          success: true,
          statistics: stats
        });
      } catch (error) {
        this.logger.error('Error getting memory statistics:', error);
        res.status(500).json({
          error: 'Failed to get memory statistics',
          message: error.message
        });
      }
    });

    // Store interaction memory
    this.app.post('/api/memory/interaction', async (req, res) => {
      try {
        const { employeeId, query, response, context } = req.body;
        
        if (!employeeId || !query || !response) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, query, response'
          });
        }

        const memoryId = await this.memoryService.storeInteractionMemory(
          employeeId,
          query,
          response,
          context || {}
        );

        res.json({
          success: true,
          memoryId: memoryId,
          employeeId: employeeId,
          type: 'interaction'
        });
      } catch (error) {
        this.logger.error('Error storing interaction memory:', error);
        res.status(500).json({
          error: 'Failed to store interaction memory',
          message: error.message
        });
      }
    });

    // Get all employees statistics
    this.app.get('/api/memory/stats', async (req, res) => {
      try {
        const employeeIds = [
          'emp_001', 'emp_002', 'emp_003', 'emp_004', 'emp_005', 'emp_006',
          'emp_007', 'emp_008', 'emp_009', 'emp_010', 'emp_011', 'emp_012', 'emp_013'
        ];

        const allStats = {};
        for (const employeeId of employeeIds) {
          try {
            allStats[employeeId] = await this.memoryService.getMemoryStatistics(employeeId);
          } catch (error) {
            this.logger.warn(`Failed to get stats for ${employeeId}:`, error);
            allStats[employeeId] = { error: error.message };
          }
        }

        res.json({
          success: true,
          statistics: allStats
        });
      } catch (error) {
        this.logger.error('Error getting all memory statistics:', error);
        res.status(500).json({
          error: 'Failed to get memory statistics',
          message: error.message
        });
      }
    });

    // ===== MEMORY LIFECYCLE MANAGEMENT ENDPOINTS =====
    // Task 5.5: Memory Cleanup and Optimization API

    // Perform memory cleanup for specific employee
    this.app.post('/api/memory/cleanup/:employeeId', async (req, res) => {
      try {
        const { employeeId } = req.params;
        const options = req.body || {};
        
        if (!employeeId) {
          return res.status(400).json({
            error: 'Missing required parameter: employeeId'
          });
        }

        const results = await this.memoryService.performEmployeeMemoryCleanup(employeeId, options);

        res.json({
          success: true,
          employeeId: employeeId,
          cleanup: results
        });
      } catch (error) {
        this.logger.error('Error performing employee memory cleanup:', error);
        res.status(500).json({
          error: 'Failed to perform memory cleanup',
          message: error.message
        });
      }
    });

    // Perform company-wide memory cleanup
    this.app.post('/api/memory/cleanup', async (req, res) => {
      try {
        const options = req.body || {};
        
        const results = await this.memoryService.performCompanyWideCleanup(options);

        res.json({
          success: true,
          companyWideCleanup: results
        });
      } catch (error) {
        this.logger.error('Error performing company-wide cleanup:', error);
        res.status(500).json({
          error: 'Failed to perform company-wide cleanup',
          message: error.message
        });
      }
    });

    // Get cleanup analytics
    this.app.get('/api/memory/analytics', async (req, res) => {
      try {
        const analytics = await this.memoryService.getCleanupAnalytics();

        res.json({
          success: true,
          analytics: analytics
        });
      } catch (error) {
        this.logger.error('Error getting cleanup analytics:', error);
        res.status(500).json({
          error: 'Failed to get cleanup analytics',
          message: error.message
        });
      }
    });

    // Archive specific memories
    this.app.post('/api/memory/archive', async (req, res) => {
      try {
        const { employeeId, memoryIds } = req.body;
        
        if (!employeeId || !memoryIds || !Array.isArray(memoryIds)) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, memoryIds (array)'
          });
        }

        const results = await this.memoryService.archiveEmployeeMemories(employeeId, memoryIds);

        res.json({
          success: true,
          employeeId: employeeId,
          archive: results
        });
      } catch (error) {
        this.logger.error('Error archiving memories:', error);
        res.status(500).json({
          error: 'Failed to archive memories',
          message: error.message
        });
      }
    });

    // Restore memories from archive
    this.app.post('/api/memory/restore', async (req, res) => {
      try {
        const { employeeId, memoryIds } = req.body;
        
        if (!employeeId || !memoryIds || !Array.isArray(memoryIds)) {
          return res.status(400).json({
            error: 'Missing required fields: employeeId, memoryIds (array)'
          });
        }

        const results = await this.memoryService.restoreEmployeeMemories(employeeId, memoryIds);

        res.json({
          success: true,
          employeeId: employeeId,
          restore: results
        });
      } catch (error) {
        this.logger.error('Error restoring memories:', error);
        res.status(500).json({
          error: 'Failed to restore memories',
          message: error.message
        });
      }
    });

    // Get memory lifecycle analysis for an employee
    this.app.get('/api/memory/lifecycle/:employeeId', async (req, res) => {
      try {
        const { employeeId } = req.params;
        const options = req.query || {};
        
        if (!employeeId) {
          return res.status(400).json({
            error: 'Missing required parameter: employeeId'
          });
        }

        const analysis = await this.memoryService.getMemoryLifecycleAnalysis(employeeId, options);

        res.json({
          success: true,
          lifecycle: analysis
        });
      } catch (error) {
        this.logger.error('Error getting lifecycle analysis:', error);
        res.status(500).json({
          error: 'Failed to get lifecycle analysis',
          message: error.message
        });
      }
    });

    // Get storage statistics for specific employee
    this.app.get('/api/memory/storage/:employeeId', async (req, res) => {
      try {
        const { employeeId } = req.params;
        
        if (!employeeId) {
          return res.status(400).json({
            error: 'Missing required parameter: employeeId'
          });
        }

        const stats = await this.memoryService.getEmployeeStorageStats(employeeId);

        res.json({
          success: true,
          storage: stats
        });
      } catch (error) {
        this.logger.error('Error getting storage statistics:', error);
        res.status(500).json({
          error: 'Failed to get storage statistics',
          message: error.message
        });
      }
    });

    // Schedule automated cleanup
    this.app.post('/api/memory/schedule', async (req, res) => {
      try {
        const options = req.body || {};
        
        const results = await this.memoryService.scheduleAutomatedCleanup(options);

        res.json({
          success: true,
          schedule: results
        });
      } catch (error) {
        this.logger.error('Error scheduling automated cleanup:', error);
        res.status(500).json({
          error: 'Failed to schedule automated cleanup',
          message: error.message
        });
      }
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        service: 'AI Company Memory System API',
        version: '2.0.0',
        endpoints: {
          // Memory Storage
          'POST /api/memory/experience': 'Store experience memory',
          'POST /api/memory/knowledge': 'Store knowledge memory',
          'POST /api/memory/decision': 'Store decision memory',
          'POST /api/memory/interaction': 'Store interaction memory',
          
          // Memory Retrieval
          'POST /api/memory/search': 'Search memories',
          'POST /api/memory/context': 'Get relevant context for task',
          'GET /api/memory/expertise/:employeeId/:domain': 'Get employee expertise',
          
          // Memory Statistics
          'GET /api/memory/stats/:employeeId': 'Get memory statistics',
          'GET /api/memory/stats': 'Get all employees statistics',
          'GET /api/memory/storage/:employeeId': 'Get storage statistics for employee',
          
          // Memory Lifecycle Management (Task 5.5)
          'POST /api/memory/cleanup/:employeeId': 'Perform memory cleanup for employee',
          'POST /api/memory/cleanup': 'Perform company-wide memory cleanup',
          'GET /api/memory/analytics': 'Get cleanup analytics and recommendations',
          'POST /api/memory/archive': 'Archive specific memories',
          'POST /api/memory/restore': 'Restore memories from archive',
          'GET /api/memory/lifecycle/:employeeId': 'Get memory lifecycle analysis',
          'POST /api/memory/schedule': 'Schedule automated cleanup',
          
          // System
          'GET /health': 'Health check',
          'GET /api/docs': 'API documentation'
        },
        new_features: {
          'memory_cleanup': 'Automated memory archival based on importance scoring',
          'storage_optimization': 'Three-tier storage system (Active/Archive/Deleted)',
          'lifecycle_management': 'Comprehensive memory lifecycle analytics',
          'cleanup_analytics': 'Real-time cleanup metrics and recommendations'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `${req.method} ${req.originalUrl} is not a valid endpoint`
      });
    });
  }

  /**
   * Start the server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info(`Memory System API listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Setup logger
   */
  setupLogger() {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/memory-api.log' })
      ]
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down Memory System API...');
      
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }
      
      if (this.memoryService) {
        await this.memoryService.shutdown();
      }
      
      this.logger.info('Memory System API shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

// Initialize and start the API
const memorySystemAPI = new MemorySystemAPI();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await memorySystemAPI.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await memorySystemAPI.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the system
memorySystemAPI.initialize().catch((error) => {
  console.error('Failed to initialize Memory System:', error);
  process.exit(1);
});

export default memorySystemAPI;