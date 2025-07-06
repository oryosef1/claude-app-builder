import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Vector Database Service for AI Company Memory System
 * Implements comprehensive memory management with Pinecone and FREE Hugging Face embeddings
 */
export class VectorDatabaseService {
  constructor() {
    this.pinecone = null;
    this.embedder = null;
    this.redis = null;
    this.index = null;
    this.logger = this.setupLogger();
    this.encryptionKey = process.env.MEMORY_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.initialized = false;
  }

  /**
   * Initialize the vector database service
   */
  async initialize() {
    try {
      this.logger.info('Initializing Vector Database Service...');
      
      // Initialize Pinecone
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });

      // Initialize Free Embedding Model
      this.logger.info('Loading free embedding model...');
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // Initialize Redis cache
      this.redis = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      });

      await this.redis.connect();

      // Get Pinecone index
      this.index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME);

      // Verify connections
      await this.verifyConnections();

      this.initialized = true;
      this.logger.info('Vector Database Service initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Vector Database Service:', error);
      throw error;
    }
  }

  /**
   * Verify all database connections
   */
  async verifyConnections() {
    try {
      // Test Pinecone connection
      await this.index.describeIndexStats();
      this.logger.info('Pinecone connection verified');

      // Test Free Embedding Model
      const testEmbedding = await this.embedder('test');
      this.logger.info('Free embedding model verified');

      // Test Redis connection
      await this.redis.ping();
      this.logger.info('Redis connection verified');

      return true;
    } catch (error) {
      this.logger.error('Connection verification failed:', error);
      throw error;
    }
  }

  /**
   * Create employee namespace in vector database
   * @param {string} employeeId - Employee ID (e.g., 'emp_002')
   * @param {string} role - Employee role (e.g., 'technical_lead')
   * @param {string} department - Employee department
   */
  async createEmployeeNamespace(employeeId, role, department) {
    try {
      const namespace = this.generateEmployeeNamespace(employeeId, role);
      
      // Create namespace metadata
      const namespaceMetadata = {
        employee_id: employeeId,
        role: role,
        department: department,
        namespace: namespace,
        created_at: new Date().toISOString(),
        memory_count: 0,
        last_accessed: new Date().toISOString()
      };

      // Store namespace metadata in Redis
      await this.redis.hSet(`namespace:${namespace}`, namespaceMetadata);

      // Create initial permissions
      await this.createNamespacePermissions(namespace, role, department);

      this.logger.info(`Employee namespace created: ${namespace}`);
      return namespace;
    } catch (error) {
      this.logger.error('Failed to create employee namespace:', error);
      throw error;
    }
  }

  /**
   * Store memory with embeddings
   * @param {string} employeeId - Employee ID
   * @param {object} memoryData - Memory data structure
   */
  async storeMemory(employeeId, memoryData) {
    try {
      if (!this.initialized) {
        throw new Error('Vector Database Service not initialized');
      }

      // Generate memory ID
      const memoryId = `mem_${employeeId}_${uuidv4()}`;
      
      // Validate memory structure
      const validatedMemory = this.validateMemoryStructure(memoryData);
      
      // Generate embeddings
      const embeddings = await this.generateAllEmbeddings(validatedMemory);
      
      // Encrypt sensitive data
      const encryptedMemory = this.encryptSensitiveData(validatedMemory, employeeId);
      
      // Prepare vector for storage
      const vectorData = {
        id: memoryId,
        values: embeddings.semantic,
        metadata: {
          employee_id: employeeId,
          memory_type: encryptedMemory.memory_type,
          content_hash: this.generateContentHash(encryptedMemory.content),
          created_at: new Date().toISOString(),
          importance: encryptedMemory.metadata?.importance || 5.0,
          tags: encryptedMemory.metadata?.tags || [],
          department: encryptedMemory.metadata?.department,
          role: encryptedMemory.metadata?.role,
          encrypted: true
        }
      };

      // Store in Pinecone
      const namespace = this.generateEmployeeNamespace(employeeId);
      await this.index.namespace(namespace).upsert([vectorData]);

      // Store full memory data in Redis for quick retrieval
      await this.redis.hSet(`memory:${memoryId}`, {
        id: memoryId,
        employee_id: employeeId,
        data: JSON.stringify(encryptedMemory),
        embeddings: JSON.stringify(embeddings),
        created_at: new Date().toISOString(),
        accessed_count: 0,
        last_accessed: new Date().toISOString()
      });

      // Update namespace statistics
      await this.updateNamespaceStats(namespace);

      this.logger.info(`Memory stored successfully: ${memoryId}`);
      return memoryId;
    } catch (error) {
      this.logger.error('Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories based on query
   * @param {string} query - Search query
   * @param {string} employeeId - Employee ID
   * @param {object} options - Search options
   */
  async retrieveMemories(query, employeeId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Vector Database Service not initialized');
      }

      const {
        topK = 5,
        includeMetadata = true,
        memoryTypes = null,
        timeRange = null,
        minImportance = 0
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Build filter
      const filter = this.buildSearchFilter(employeeId, memoryTypes, timeRange, minImportance);

      // Search in Pinecone
      const namespace = this.generateEmployeeNamespace(employeeId);
      const searchResults = await this.index.namespace(namespace).query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: includeMetadata,
        filter: filter
      });

      // Retrieve full memory data from Redis
      const enrichedResults = await this.enrichSearchResults(searchResults.matches);

      // Decrypt sensitive data
      const decryptedResults = enrichedResults.map(result => ({
        ...result,
        memory: this.decryptSensitiveData(result.memory, employeeId)
      }));

      // Update access statistics
      await this.updateAccessStatistics(decryptedResults);

      this.logger.info(`Retrieved ${decryptedResults.length} memories for query: ${query}`);
      return decryptedResults;
    } catch (error) {
      this.logger.error('Failed to retrieve memories:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for memory content
   * @param {object} memoryData - Memory data to embed
   */
  async generateAllEmbeddings(memoryData) {
    try {
      // Prepare content for embedding
      const embeddingContent = this.prepareEmbeddingContent(memoryData);

      // Generate semantic embedding (primary)
      const semanticEmbedding = await this.generateEmbedding(embeddingContent);

      // Generate task-specific embedding
      const taskEmbedding = await this.generateTaskSpecificEmbedding(
        embeddingContent,
        memoryData.metadata?.role
      );

      // Generate temporal embedding
      const temporalEmbedding = this.generateTemporalEmbedding(
        memoryData.metadata?.timestamp || new Date().toISOString()
      );

      return {
        semantic: semanticEmbedding,
        task_specific: taskEmbedding,
        temporal: temporalEmbedding
      };
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate semantic embedding using free model
   * @param {string} content - Content to embed
   */
  async generateEmbedding(content) {
    try {
      const embedding = await this.embedder(content, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to array and ensure 384 dimensions (all-MiniLM-L6-v2 model)
      const embeddingArray = Array.from(embedding.data);
      
      // Pad to 1536 dimensions for consistency with Pinecone index
      while (embeddingArray.length < 1536) {
        embeddingArray.push(0);
      }
      
      return embeddingArray.slice(0, 1536);
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate task-specific embedding
   * @param {string} content - Content to embed
   * @param {string} role - Employee role
   */
  async generateTaskSpecificEmbedding(content, role) {
    try {
      // Add role-specific context to content
      const roleContext = this.getRoleContext(role);
      const contextualContent = `${roleContext} ${content}`;

      const embedding = await this.embedder(contextualContent, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to array and ensure proper dimensions
      const embeddingArray = Array.from(embedding.data);
      
      // Pad to 1536 dimensions for consistency
      while (embeddingArray.length < 1536) {
        embeddingArray.push(0);
      }
      
      return embeddingArray.slice(0, 1536);
    } catch (error) {
      this.logger.error('Failed to generate task-specific embedding:', error);
      throw error;
    }
  }

  /**
   * Generate temporal embedding
   * @param {string} timestamp - ISO timestamp
   */
  generateTemporalEmbedding(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // Calculate time-based features
      const daysSinceCreation = (now - date) / (1000 * 60 * 60 * 24);
      const hourOfDay = date.getHours() / 24;
      const dayOfWeek = date.getDay() / 7;
      const monthOfYear = date.getMonth() / 12;

      // Create 512-dimension temporal embedding
      const embedding = new Array(512).fill(0);
      
      // Encode temporal features
      embedding[0] = Math.exp(-daysSinceCreation / 30); // Recency decay
      embedding[1] = hourOfDay;
      embedding[2] = dayOfWeek;
      embedding[3] = monthOfYear;
      
      // Fill remaining dimensions with derived temporal features
      for (let i = 4; i < 512; i++) {
        embedding[i] = Math.sin(daysSinceCreation * Math.PI / (30 * (i - 3)));
      }

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate temporal embedding:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive memory data
   * @param {object} memoryData - Memory data to encrypt
   * @param {string} employeeId - Employee ID
   */
  encryptSensitiveData(memoryData, employeeId) {
    try {
      const sensitiveFields = ['content', 'context', 'personal_notes'];
      const encryptedData = { ...memoryData };

      sensitiveFields.forEach(field => {
        if (encryptedData[field]) {
          encryptedData[field] = this.encrypt(encryptedData[field], employeeId);
        }
      });

      return encryptedData;
    } catch (error) {
      this.logger.error('Failed to encrypt sensitive data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive memory data
   * @param {object} encryptedData - Encrypted memory data
   * @param {string} employeeId - Employee ID
   */
  decryptSensitiveData(encryptedData, employeeId) {
    try {
      const sensitiveFields = ['content', 'context', 'personal_notes'];
      const decryptedData = { ...encryptedData };

      sensitiveFields.forEach(field => {
        if (decryptedData[field] && typeof decryptedData[field] === 'object' && decryptedData[field].encrypted) {
          decryptedData[field] = this.decrypt(decryptedData[field], employeeId);
        }
      });

      return decryptedData;
    } catch (error) {
      this.logger.error('Failed to decrypt sensitive data:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {any} data - Data to encrypt
   * @param {string} employeeId - Employee ID
   */
  encrypt(data, employeeId) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'base64'), iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        employee_id: employeeId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {object} encryptedData - Encrypted data object
   * @param {string} employeeId - Employee ID
   */
  decrypt(encryptedData, employeeId) {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'base64'), iv);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Validate memory structure
   * @param {object} memoryData - Memory data to validate
   */
  validateMemoryStructure(memoryData) {
    const requiredFields = ['memory_type', 'content'];
    const validMemoryTypes = ['experience', 'knowledge', 'decision'];

    // Check required fields
    for (const field of requiredFields) {
      if (!memoryData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate memory type
    if (!validMemoryTypes.includes(memoryData.memory_type)) {
      throw new Error(`Invalid memory type: ${memoryData.memory_type}`);
    }

    // Ensure metadata exists
    if (!memoryData.metadata) {
      memoryData.metadata = {};
    }

    // Set default importance if not provided
    if (!memoryData.metadata.importance) {
      memoryData.metadata.importance = 5.0;
    }

    // Set timestamp if not provided
    if (!memoryData.metadata.timestamp) {
      memoryData.metadata.timestamp = new Date().toISOString();
    }

    return memoryData;
  }

  /**
   * Generate employee namespace
   * @param {string} employeeId - Employee ID
   * @param {string} role - Employee role (optional)
   */
  generateEmployeeNamespace(employeeId, role = null) {
    if (role) {
      const roleAbbr = this.getRoleAbbreviation(role);
      return `${employeeId}_${roleAbbr}`;
    }
    return employeeId;
  }

  /**
   * Get role abbreviation
   * @param {string} role - Full role name
   */
  getRoleAbbreviation(role) {
    const abbreviations = {
      'project_manager': 'pm',
      'technical_lead': 'tl',
      'qa_director': 'qd',
      'senior_developer': 'sd',
      'junior_developer': 'jd',
      'qa_engineer': 'qe',
      'test_engineer': 'te',
      'devops_engineer': 'do',
      'sre': 'sre',
      'security_engineer': 'se',
      'technical_writer': 'tw',
      'ui_ux_designer': 'ux',
      'build_engineer': 'be'
    };

    return abbreviations[role] || role.substring(0, 3);
  }

  /**
   * Get role context for embeddings
   * @param {string} role - Employee role
   */
  getRoleContext(role) {
    const contexts = {
      'technical_lead': 'Technical architecture and system design context:',
      'senior_developer': 'Senior development and implementation context:',
      'junior_developer': 'Junior development and learning context:',
      'qa_engineer': 'Quality assurance and testing context:',
      'test_engineer': 'Test implementation and coverage analysis context:',
      'devops_engineer': 'DevOps and infrastructure context:',
      'sre': 'Site reliability and monitoring context:',
      'security_engineer': 'Security audits and vulnerability analysis context:',
      'project_manager': 'Project management and coordination context:',
      'qa_director': 'Quality standards and release approval context:',
      'technical_writer': 'Documentation and technical writing context:',
      'ui_ux_designer': 'User interface and experience design context:',
      'build_engineer': 'Build systems and dependency management context:'
    };

    return contexts[role] || 'General context:';
  }

  /**
   * Prepare content for embedding
   * @param {object} memoryData - Memory data
   */
  prepareEmbeddingContent(memoryData) {
    let content = memoryData.content;

    // Add context if available
    if (memoryData.context) {
      content += ` Context: ${JSON.stringify(memoryData.context)}`;
    }

    // Add metadata tags
    if (memoryData.metadata?.tags) {
      content += ` Tags: ${memoryData.metadata.tags.join(', ')}`;
    }

    return content;
  }

  /**
   * Build search filter for Pinecone
   * @param {string} employeeId - Employee ID
   * @param {array} memoryTypes - Memory types to filter
   * @param {object} timeRange - Time range filter
   * @param {number} minImportance - Minimum importance score
   */
  buildSearchFilter(employeeId, memoryTypes, timeRange, minImportance) {
    const filter = {
      employee_id: { $eq: employeeId }
    };

    if (memoryTypes && memoryTypes.length > 0) {
      filter.memory_type = { $in: memoryTypes };
    }

    if (minImportance > 0) {
      filter.importance = { $gte: minImportance };
    }

    if (timeRange) {
      if (timeRange.start) {
        filter.created_at = { $gte: timeRange.start };
      }
      if (timeRange.end) {
        filter.created_at = { ...filter.created_at, $lte: timeRange.end };
      }
    }

    return filter;
  }

  /**
   * Enrich search results with full memory data
   * @param {array} matches - Pinecone search matches
   */
  async enrichSearchResults(matches) {
    const enrichedResults = [];

    for (const match of matches) {
      try {
        const memoryData = await this.redis.hGetAll(`memory:${match.id}`);
        
        if (memoryData.data) {
          enrichedResults.push({
            id: match.id,
            score: match.score,
            metadata: match.metadata,
            memory: JSON.parse(memoryData.data),
            embeddings: JSON.parse(memoryData.embeddings),
            accessed_count: parseInt(memoryData.accessed_count) || 0,
            last_accessed: memoryData.last_accessed
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to enrich result for memory ${match.id}:`, error);
      }
    }

    return enrichedResults;
  }

  /**
   * Update access statistics
   * @param {array} results - Search results
   */
  async updateAccessStatistics(results) {
    for (const result of results) {
      try {
        await this.redis.hIncrBy(`memory:${result.id}`, 'accessed_count', 1);
        await this.redis.hSet(`memory:${result.id}`, 'last_accessed', new Date().toISOString());
      } catch (error) {
        this.logger.warn(`Failed to update access statistics for ${result.id}:`, error);
      }
    }
  }

  /**
   * Update namespace statistics
   * @param {string} namespace - Namespace name
   */
  async updateNamespaceStats(namespace) {
    try {
      await this.redis.hIncrBy(`namespace:${namespace}`, 'memory_count', 1);
      await this.redis.hSet(`namespace:${namespace}`, 'last_accessed', new Date().toISOString());
    } catch (error) {
      this.logger.warn(`Failed to update namespace statistics:`, error);
    }
  }

  /**
   * Create namespace permissions
   * @param {string} namespace - Namespace name
   * @param {string} role - Employee role
   * @param {string} department - Employee department
   */
  async createNamespacePermissions(namespace, role, department) {
    const permissions = {
      own_memories: 'read_write',
      department_memories: this.getDepartmentPermissions(role),
      company_knowledge: this.getCompanyKnowledgePermissions(role),
      cross_department: this.getCrossDepartmentPermissions(role)
    };

    await this.redis.hSet(`permissions:${namespace}`, permissions);
  }

  /**
   * Get department permissions based on role
   * @param {string} role - Employee role
   */
  getDepartmentPermissions(role) {
    const leadRoles = ['technical_lead', 'project_manager', 'qa_director'];
    return leadRoles.includes(role) ? 'read_write' : 'read_only';
  }

  /**
   * Get company knowledge permissions based on role
   * @param {string} role - Employee role
   */
  getCompanyKnowledgePermissions(role) {
    const adminRoles = ['technical_lead', 'project_manager', 'qa_director'];
    return adminRoles.includes(role) ? 'read_write' : 'read_only';
  }

  /**
   * Get cross-department permissions based on role
   * @param {string} role - Employee role
   */
  getCrossDepartmentPermissions(role) {
    const leadRoles = ['technical_lead', 'project_manager', 'qa_director'];
    return leadRoles.includes(role) ? 'limited_read' : 'no_access';
  }

  /**
   * Generate content hash
   * @param {string|object} content - Content to hash
   */
  generateContentHash(content) {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
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
        new winston.transports.File({ filename: 'logs/vector-db-service.log' })
      ]
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down Vector Database Service...');
      
      if (this.redis) {
        await this.redis.quit();
      }
      
      this.logger.info('Vector Database Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default VectorDatabaseService;