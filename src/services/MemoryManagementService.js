import VectorDatabaseService from './VectorDatabaseService.js';
import winston from 'winston';

/**
 * Memory Management Service
 * High-level memory operations for AI employees
 */
export class MemoryManagementService {
  constructor() {
    this.vectorDb = new VectorDatabaseService();
    this.logger = this.setupLogger();
    this.initialized = false;
  }

  /**
   * Initialize the memory management service
   */
  async initialize() {
    try {
      this.logger.info('Initializing Memory Management Service...');
      
      await this.vectorDb.initialize();
      
      // Initialize all employee namespaces
      await this.initializeEmployeeNamespaces();
      
      this.initialized = true;
      this.logger.info('Memory Management Service initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Memory Management Service:', error);
      throw error;
    }
  }

  /**
   * Initialize namespaces for all 13 AI employees
   */
  async initializeEmployeeNamespaces() {
    const employees = [
      { id: 'emp_001', role: 'project_manager', department: 'Executive' },
      { id: 'emp_002', role: 'technical_lead', department: 'Executive' },
      { id: 'emp_003', role: 'qa_director', department: 'Executive' },
      { id: 'emp_004', role: 'senior_developer', department: 'Development' },
      { id: 'emp_005', role: 'junior_developer', department: 'Development' },
      { id: 'emp_006', role: 'qa_engineer', department: 'Development' },
      { id: 'emp_007', role: 'test_engineer', department: 'Development' },
      { id: 'emp_008', role: 'devops_engineer', department: 'Operations' },
      { id: 'emp_009', role: 'sre', department: 'Operations' },
      { id: 'emp_010', role: 'security_engineer', department: 'Operations' },
      { id: 'emp_011', role: 'technical_writer', department: 'Support' },
      { id: 'emp_012', role: 'ui_ux_designer', department: 'Support' },
      { id: 'emp_013', role: 'build_engineer', department: 'Support' }
    ];

    for (const employee of employees) {
      try {
        await this.vectorDb.createEmployeeNamespace(
          employee.id,
          employee.role,
          employee.department
        );
        this.logger.info(`Initialized namespace for ${employee.id} (${employee.role})`);
      } catch (error) {
        this.logger.warn(`Failed to initialize namespace for ${employee.id}:`, error);
      }
    }
  }

  /**
   * Store an experience memory
   * @param {string} employeeId - Employee ID
   * @param {string} content - Experience description
   * @param {object} context - Experience context
   * @param {object} metadata - Additional metadata
   */
  async storeExperienceMemory(employeeId, content, context, metadata = {}) {
    try {
      const memoryData = {
        memory_type: 'experience',
        content: content,
        context: {
          project: context.project || 'unknown',
          technologies: context.technologies || [],
          outcome: context.outcome || 'unknown',
          lessons_learned: context.lessons_learned || [],
          ...context
        },
        metadata: {
          timestamp: new Date().toISOString(),
          importance: metadata.importance || 7.0,
          tags: metadata.tags || ['experience'],
          department: await this.getEmployeeDepartment(employeeId),
          role: await this.getEmployeeRole(employeeId),
          ...metadata
        }
      };

      const memoryId = await this.vectorDb.storeMemory(employeeId, memoryData);
      this.logger.info(`Experience memory stored for ${employeeId}: ${memoryId}`);
      
      return memoryId;
    } catch (error) {
      this.logger.error(`Failed to store experience memory for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Store a knowledge memory
   * @param {string} employeeId - Employee ID
   * @param {string} content - Knowledge content
   * @param {object} context - Knowledge context
   * @param {object} metadata - Additional metadata
   */
  async storeKnowledgeMemory(employeeId, content, context, metadata = {}) {
    try {
      const memoryData = {
        memory_type: 'knowledge',
        content: content,
        context: {
          domain: context.domain || 'general',
          complexity: context.complexity || 'intermediate',
          applications: context.applications || [],
          ...context
        },
        metadata: {
          timestamp: new Date().toISOString(),
          importance: metadata.importance || 6.0,
          tags: metadata.tags || ['knowledge'],
          source: metadata.source || 'experience',
          confidence: metadata.confidence || 8.0,
          department: await this.getEmployeeDepartment(employeeId),
          role: await this.getEmployeeRole(employeeId),
          ...metadata
        }
      };

      const memoryId = await this.vectorDb.storeMemory(employeeId, memoryData);
      this.logger.info(`Knowledge memory stored for ${employeeId}: ${memoryId}`);
      
      return memoryId;
    } catch (error) {
      this.logger.error(`Failed to store knowledge memory for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Store a decision memory
   * @param {string} employeeId - Employee ID
   * @param {string} content - Decision description
   * @param {object} context - Decision context
   * @param {object} metadata - Additional metadata
   */
  async storeDecisionMemory(employeeId, content, context, metadata = {}) {
    try {
      const memoryData = {
        memory_type: 'decision',
        content: content,
        context: {
          decision_type: context.decision_type || 'general',
          alternatives: context.alternatives || [],
          criteria: context.criteria || [],
          rationale: context.rationale || '',
          ...context
        },
        metadata: {
          timestamp: new Date().toISOString(),
          importance: metadata.importance || 8.0,
          tags: metadata.tags || ['decision'],
          decision_date: metadata.decision_date || new Date().toISOString(),
          stakeholders: metadata.stakeholders || [],
          outcome: metadata.outcome || 'pending',
          effectiveness: metadata.effectiveness || null,
          department: await this.getEmployeeDepartment(employeeId),
          role: await this.getEmployeeRole(employeeId),
          ...metadata
        }
      };

      const memoryId = await this.vectorDb.storeMemory(employeeId, memoryData);
      this.logger.info(`Decision memory stored for ${employeeId}: ${memoryId}`);
      
      return memoryId;
    } catch (error) {
      this.logger.error(`Failed to store decision memory for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Search memories for an employee
   * @param {string} employeeId - Employee ID
   * @param {string} query - Search query
   * @param {object} options - Search options
   */
  async searchMemories(employeeId, query, options = {}) {
    try {
      const searchOptions = {
        topK: options.topK || 5,
        includeMetadata: options.includeMetadata !== false,
        memoryTypes: options.memoryTypes || null,
        timeRange: options.timeRange || null,
        minImportance: options.minImportance || 0
      };

      const results = await this.vectorDb.retrieveMemories(employeeId, query, searchOptions);
      
      // Post-process results
      const processedResults = this.postProcessResults(results, options);
      
      this.logger.info(`Memory search completed for ${employeeId}: ${processedResults.length} results`);
      
      return processedResults;
    } catch (error) {
      this.logger.error(`Failed to search memories for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get relevant context for a task
   * @param {string} employeeId - Employee ID
   * @param {string} taskDescription - Task description
   * @param {object} options - Search options
   */
  async getRelevantContext(employeeId, taskDescription, options = {}) {
    try {
      const contextOptions = {
        topK: options.topK || 10,
        includeMetadata: true,
        memoryTypes: options.memoryTypes || ['experience', 'knowledge', 'decision'],
        minImportance: options.minImportance || 5.0
      };

      const memories = await this.searchMemories(employeeId, taskDescription, contextOptions);
      
      // Rank memories by relevance to task
      const rankedMemories = this.rankMemoriesByRelevance(memories, taskDescription);
      
      // Generate context summary
      const contextSummary = this.generateContextSummary(rankedMemories, taskDescription);
      
      return {
        memories: rankedMemories,
        summary: contextSummary,
        total_results: memories.length,
        relevance_scores: rankedMemories.map(m => m.relevance_score)
      };
    } catch (error) {
      this.logger.error(`Failed to get relevant context for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get employee expertise in a domain
   * @param {string} employeeId - Employee ID
   * @param {string} domain - Domain to assess
   */
  async getEmployeeExpertise(employeeId, domain) {
    try {
      const expertiseOptions = {
        topK: 20,
        memoryTypes: ['experience', 'knowledge'],
        minImportance: 6.0
      };

      const relevantMemories = await this.searchMemories(employeeId, domain, expertiseOptions);
      
      // Calculate expertise metrics
      const expertiseMetrics = this.calculateExpertiseMetrics(relevantMemories, domain);
      
      return {
        employee_id: employeeId,
        domain: domain,
        expertise_score: expertiseMetrics.score,
        experience_count: expertiseMetrics.experience_count,
        knowledge_count: expertiseMetrics.knowledge_count,
        recent_activity: expertiseMetrics.recent_activity,
        key_skills: expertiseMetrics.key_skills,
        confidence_level: expertiseMetrics.confidence_level
      };
    } catch (error) {
      this.logger.error(`Failed to get expertise for ${employeeId} in ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Store interaction memory (for learning)
   * @param {string} employeeId - Employee ID
   * @param {string} query - Original query
   * @param {string} response - AI response
   * @param {object} context - Interaction context
   */
  async storeInteractionMemory(employeeId, query, response, context = {}) {
    try {
      const interactionContent = `Query: ${query}\nResponse: ${response}`;
      
      const memoryData = {
        memory_type: 'knowledge',
        content: interactionContent,
        context: {
          domain: 'interaction',
          query_type: context.query_type || 'general',
          response_quality: context.response_quality || null,
          feedback: context.feedback || null,
          ...context
        },
        metadata: {
          timestamp: new Date().toISOString(),
          importance: 4.0, // Lower importance for interactions
          tags: ['interaction', 'learning'],
          source: 'ai_interaction',
          confidence: 7.0,
          department: await this.getEmployeeDepartment(employeeId),
          role: await this.getEmployeeRole(employeeId)
        }
      };

      const memoryId = await this.vectorDb.storeMemory(employeeId, memoryData);
      this.logger.debug(`Interaction memory stored for ${employeeId}: ${memoryId}`);
      
      return memoryId;
    } catch (error) {
      this.logger.error(`Failed to store interaction memory for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get memory statistics for an employee
   * @param {string} employeeId - Employee ID
   */
  async getMemoryStatistics(employeeId) {
    try {
      const namespace = this.vectorDb.generateEmployeeNamespace(employeeId);
      const stats = await this.vectorDb.getRedisClient().hgetall(`namespace:${namespace}`);
      
      return {
        employee_id: employeeId,
        namespace: namespace,
        total_memories: parseInt(stats.memory_count) || 0,
        created_at: stats.created_at,
        last_accessed: stats.last_accessed,
        department: stats.department,
        role: stats.role
      };
    } catch (error) {
      this.logger.error(`Failed to get memory statistics for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Post-process search results
   * @param {array} results - Raw search results
   * @param {object} options - Processing options
   */
  postProcessResults(results, options) {
    let processedResults = results;

    // Sort by relevance score
    processedResults.sort((a, b) => b.score - a.score);

    // Apply time-based boosting if requested
    if (options.boostRecent) {
      processedResults = this.applyTimeBasedBoosting(processedResults);
    }

    // Apply importance filtering
    if (options.minImportance) {
      processedResults = processedResults.filter(
        result => result.memory.metadata.importance >= options.minImportance
      );
    }

    // Limit results
    if (options.maxResults) {
      processedResults = processedResults.slice(0, options.maxResults);
    }

    return processedResults;
  }

  /**
   * Apply time-based boosting to results
   * @param {array} results - Search results
   */
  applyTimeBasedBoosting(results) {
    const now = new Date();
    
    return results.map(result => {
      const memoryDate = new Date(result.memory.metadata.timestamp);
      const daysSinceCreation = (now - memoryDate) / (1000 * 60 * 60 * 24);
      
      // Boost recent memories (within 30 days)
      const timeBoost = Math.max(0, 1 - daysSinceCreation / 30);
      const boostedScore = result.score * (1 + timeBoost * 0.2);
      
      return {
        ...result,
        score: boostedScore,
        time_boost: timeBoost
      };
    });
  }

  /**
   * Rank memories by relevance to a specific task
   * @param {array} memories - Memory results
   * @param {string} taskDescription - Task description
   */
  rankMemoriesByRelevance(memories, taskDescription) {
    return memories.map(memory => {
      // Calculate relevance score based on multiple factors
      const baseScore = memory.score;
      const importanceScore = memory.memory.metadata.importance / 10;
      const typeScore = this.getMemoryTypeScore(memory.memory.memory_type, taskDescription);
      const recencyScore = this.getRecencyScore(memory.memory.metadata.timestamp);
      
      const relevanceScore = (baseScore * 0.4) + (importanceScore * 0.3) + (typeScore * 0.2) + (recencyScore * 0.1);
      
      return {
        ...memory,
        relevance_score: relevanceScore
      };
    }).sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Get memory type score for task relevance
   * @param {string} memoryType - Memory type
   * @param {string} taskDescription - Task description
   */
  getMemoryTypeScore(memoryType, taskDescription) {
    const taskLower = taskDescription.toLowerCase();
    
    if (memoryType === 'experience') {
      // Experience is more relevant for implementation tasks
      return taskLower.includes('implement') || taskLower.includes('build') ? 0.9 : 0.7;
    } else if (memoryType === 'knowledge') {
      // Knowledge is more relevant for learning/understanding tasks
      return taskLower.includes('learn') || taskLower.includes('understand') ? 0.9 : 0.8;
    } else if (memoryType === 'decision') {
      // Decisions are more relevant for planning/architecture tasks
      return taskLower.includes('plan') || taskLower.includes('decide') || taskLower.includes('architecture') ? 0.9 : 0.6;
    }
    
    return 0.5;
  }

  /**
   * Get recency score for memory
   * @param {string} timestamp - Memory timestamp
   */
  getRecencyScore(timestamp) {
    const now = new Date();
    const memoryDate = new Date(timestamp);
    const daysSinceCreation = (now - memoryDate) / (1000 * 60 * 60 * 24);
    
    // Exponential decay with 30-day half-life
    return Math.exp(-daysSinceCreation / 30);
  }

  /**
   * Generate context summary from memories
   * @param {array} memories - Ranked memories
   * @param {string} taskDescription - Task description
   */
  generateContextSummary(memories, taskDescription) {
    const experienceMemories = memories.filter(m => m.memory.memory_type === 'experience');
    const knowledgeMemories = memories.filter(m => m.memory.memory_type === 'knowledge');
    const decisionMemories = memories.filter(m => m.memory.memory_type === 'decision');
    
    return {
      task: taskDescription,
      total_memories: memories.length,
      experience_count: experienceMemories.length,
      knowledge_count: knowledgeMemories.length,
      decision_count: decisionMemories.length,
      avg_relevance: memories.reduce((sum, m) => sum + m.relevance_score, 0) / memories.length,
      key_experiences: experienceMemories.slice(0, 3).map(m => m.memory.content.substring(0, 100) + '...'),
      key_knowledge: knowledgeMemories.slice(0, 3).map(m => m.memory.content.substring(0, 100) + '...'),
      key_decisions: decisionMemories.slice(0, 2).map(m => m.memory.content.substring(0, 100) + '...')
    };
  }

  /**
   * Calculate expertise metrics for an employee in a domain
   * @param {array} memories - Relevant memories
   * @param {string} domain - Domain name
   */
  calculateExpertiseMetrics(memories, domain) {
    const experienceMemories = memories.filter(m => m.memory.memory_type === 'experience');
    const knowledgeMemories = memories.filter(m => m.memory.memory_type === 'knowledge');
    
    // Calculate base expertise score
    const experienceScore = experienceMemories.reduce((sum, m) => sum + m.memory.metadata.importance, 0);
    const knowledgeScore = knowledgeMemories.reduce((sum, m) => sum + m.memory.metadata.importance, 0);
    const totalScore = experienceScore + knowledgeScore;
    
    // Normalize to 0-10 scale
    const normalizedScore = Math.min(10, totalScore / 10);
    
    // Calculate recent activity (memories in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMemories = memories.filter(m => 
      new Date(m.memory.metadata.timestamp) >= thirtyDaysAgo
    );
    
    // Extract key skills from memory tags
    const allTags = memories.flatMap(m => m.memory.metadata.tags || []);
    const skillCounts = allTags.reduce((counts, tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      return counts;
    }, {});
    
    const keySkills = Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));
    
    // Calculate confidence level
    const avgImportance = memories.reduce((sum, m) => sum + m.memory.metadata.importance, 0) / memories.length;
    const confidenceLevel = Math.min(10, avgImportance * (memories.length / 5));
    
    return {
      score: normalizedScore,
      experience_count: experienceMemories.length,
      knowledge_count: knowledgeMemories.length,
      recent_activity: recentMemories.length,
      key_skills: keySkills,
      confidence_level: confidenceLevel
    };
  }

  /**
   * Get employee department
   * @param {string} employeeId - Employee ID
   */
  async getEmployeeDepartment(employeeId) {
    const departmentMap = {
      'emp_001': 'Executive', 'emp_002': 'Executive', 'emp_003': 'Executive',
      'emp_004': 'Development', 'emp_005': 'Development', 'emp_006': 'Development', 'emp_007': 'Development',
      'emp_008': 'Operations', 'emp_009': 'Operations', 'emp_010': 'Operations',
      'emp_011': 'Support', 'emp_012': 'Support', 'emp_013': 'Support'
    };
    
    return departmentMap[employeeId] || 'Unknown';
  }

  /**
   * Get employee role
   * @param {string} employeeId - Employee ID
   */
  async getEmployeeRole(employeeId) {
    const roleMap = {
      'emp_001': 'project_manager', 'emp_002': 'technical_lead', 'emp_003': 'qa_director',
      'emp_004': 'senior_developer', 'emp_005': 'junior_developer', 'emp_006': 'qa_engineer', 'emp_007': 'test_engineer',
      'emp_008': 'devops_engineer', 'emp_009': 'sre', 'emp_010': 'security_engineer',
      'emp_011': 'technical_writer', 'emp_012': 'ui_ux_designer', 'emp_013': 'build_engineer'
    };
    
    return roleMap[employeeId] || 'unknown';
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
        new winston.transports.File({ filename: 'logs/memory-management.log' })
      ]
    });
  }

  // ===== MEMORY LIFECYCLE MANAGEMENT =====
  // High-level interface for Task 5.5: Memory Cleanup and Optimization

  /**
   * Perform memory cleanup for an employee
   * @param {string} employeeId - Employee ID
   * @param {object} options - Cleanup options
   * @returns {object} Cleanup results
   */
  async performEmployeeMemoryCleanup(employeeId, options = {}) {
    try {
      this.logger.info(`Starting memory cleanup for employee ${employeeId}`);
      
      const results = await this.vectorDb.performMemoryCleanup(employeeId, options);
      
      this.logger.info(`Memory cleanup completed for ${employeeId}`, {
        archived: results.archival.archivedCount,
        savedMB: results.storage.savedMB,
        executionTime: `${results.executionTimeMs}ms`
      });
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to perform memory cleanup for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Perform memory cleanup for all employees
   * @param {object} options - Cleanup options
   * @returns {object} Aggregate cleanup results
   */
  async performCompanyWideCleanup(options = {}) {
    try {
      const employees = [
        'emp_001', 'emp_002', 'emp_003', 'emp_004', 'emp_005', 'emp_006',
        'emp_007', 'emp_008', 'emp_009', 'emp_010', 'emp_011', 'emp_012', 'emp_013'
      ];
      
      this.logger.info(`Starting company-wide memory cleanup for ${employees.length} employees`);
      
      const results = [];
      let totalArchived = 0;
      let totalSavedMB = 0;
      let totalExecutionTime = 0;
      let successCount = 0;
      let errorCount = 0;
      
      for (const employeeId of employees) {
        try {
          const result = await this.performEmployeeMemoryCleanup(employeeId, options);
          results.push(result);
          
          totalArchived += result.archival.archivedCount;
          totalSavedMB += result.storage.savedMB;
          totalExecutionTime += result.executionTimeMs;
          successCount++;
          
          // Small delay between employees to prevent overload
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(`Cleanup failed for employee ${employeeId}:`, error);
          results.push({
            success: false,
            employeeId,
            error: error.message
          });
          errorCount++;
        }
      }
      
      const aggregateResults = {
        success: true,
        totalEmployees: employees.length,
        successfulCleanups: successCount,
        failedCleanups: errorCount,
        aggregate: {
          totalMemoriesArchived: totalArchived,
          totalStorageSavedMB: totalSavedMB,
          totalExecutionTimeMs: totalExecutionTime,
          averageExecutionTimeMs: totalExecutionTime / successCount
        },
        employeeResults: results,
        timestamp: new Date().toISOString()
      };
      
      this.logger.info('Company-wide memory cleanup completed', {
        successful: successCount,
        failed: errorCount,
        totalArchived,
        totalSavedMB: totalSavedMB.toFixed(2)
      });
      
      return aggregateResults;
    } catch (error) {
      this.logger.error('Failed to perform company-wide cleanup:', error);
      throw error;
    }
  }

  /**
   * Get memory storage statistics for an employee
   * @param {string} employeeId - Employee ID
   * @returns {object} Storage statistics
   */
  async getEmployeeStorageStats(employeeId) {
    try {
      const stats = await this.vectorDb.getStorageStatistics(employeeId);
      
      // Enhance with additional metadata
      const enhancedStats = {
        ...stats,
        department: await this.getEmployeeDepartment(employeeId),
        role: await this.getEmployeeRole(employeeId),
        storageStatus: stats.estimatedSizeMB > 100 ? 'over_target' : 'within_target',
        targetStorageMB: 100,
        utilizationPercent: (stats.estimatedSizeMB / 100) * 100
      };
      
      return enhancedStats;
    } catch (error) {
      this.logger.error(`Failed to get storage statistics for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive cleanup analytics for the company
   * @returns {object} Cleanup analytics
   */
  async getCleanupAnalytics() {
    try {
      const analytics = await this.vectorDb.getCleanupAnalytics();
      
      // Enhance with additional business metrics
      const enhancedAnalytics = {
        ...analytics,
        businessMetrics: {
          storageEfficiency: (analytics.employeesOverTarget / analytics.totalEmployees) < 0.2 ? 'excellent' :
                           (analytics.employeesOverTarget / analytics.totalEmployees) < 0.5 ? 'good' : 'needs_attention',
          costProjection: {
            currentMonthlyCostUSD: 0, // Free system
            projectedSavingsUSD: analytics.totalEstimatedSizeMB * 0.001 // Hypothetical cost if paid
          },
          recommendations: this.generateCleanupRecommendations(analytics)
        }
      };
      
      return enhancedAnalytics;
    } catch (error) {
      this.logger.error('Failed to get cleanup analytics:', error);
      throw error;
    }
  }

  /**
   * Archive specific memories for an employee
   * @param {string} employeeId - Employee ID
   * @param {Array} memoryIds - Memory IDs to archive
   * @returns {object} Archive results
   */
  async archiveEmployeeMemories(employeeId, memoryIds) {
    try {
      this.logger.info(`Archiving ${memoryIds.length} memories for employee ${employeeId}`);
      
      // Get memories for analysis first
      const memories = await this.vectorDb.getMemoriesForLifecycleAnalysis(employeeId);
      const memoriesToArchive = memories.filter(memory => memoryIds.includes(memory.id));
      
      if (memoriesToArchive.length === 0) {
        throw new Error('No valid memories found to archive');
      }
      
      const results = await this.vectorDb.archiveMemories(employeeId, memoriesToArchive);
      
      this.logger.info(`Memory archival completed for ${employeeId}`, {
        requested: memoryIds.length,
        archived: results.archivedCount,
        errors: results.errors.length
      });
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to archive memories for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Restore memories from archive for an employee
   * @param {string} employeeId - Employee ID
   * @param {Array} memoryIds - Memory IDs to restore
   * @returns {object} Restoration results
   */
  async restoreEmployeeMemories(employeeId, memoryIds) {
    try {
      this.logger.info(`Restoring ${memoryIds.length} memories for employee ${employeeId}`);
      
      const results = await this.vectorDb.restoreMemories(employeeId, memoryIds);
      
      this.logger.info(`Memory restoration completed for ${employeeId}`, {
        requested: memoryIds.length,
        restored: results.restoredCount,
        errors: results.errors.length
      });
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to restore memories for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule automated cleanup for the company
   * @param {object} options - Scheduling options
   * @returns {object} Scheduling results
   */
  async scheduleAutomatedCleanup(options = {}) {
    try {
      const scheduleResults = await this.vectorDb.scheduleAutomatedCleanup(options);
      
      this.logger.info('Automated cleanup scheduled', {
        schedule: scheduleResults.schedule,
        employees: scheduleResults.employees,
        timezone: scheduleResults.timezone
      });
      
      return scheduleResults;
    } catch (error) {
      this.logger.error('Failed to schedule automated cleanup:', error);
      throw error;
    }
  }

  /**
   * Generate cleanup recommendations based on analytics
   * @param {object} analytics - Cleanup analytics
   * @returns {Array} Recommendations
   */
  generateCleanupRecommendations(analytics) {
    const recommendations = [];
    
    // Storage efficiency recommendations
    if (analytics.employeesOverTarget > 0) {
      recommendations.push({
        type: 'storage_optimization',
        priority: 'high',
        message: `${analytics.employeesOverTarget} employees exceed 100MB storage target`,
        action: 'Run memory cleanup for over-target employees'
      });
    }
    
    // Average storage recommendations
    if (analytics.averageStorageMB > 80) {
      recommendations.push({
        type: 'preventive_cleanup',
        priority: 'medium',
        message: `Average storage (${analytics.averageStorageMB.toFixed(1)}MB) approaching target`,
        action: 'Schedule more frequent cleanup cycles'
      });
    }
    
    // Performance recommendations
    if (analytics.totalVectorCount > 10000) {
      recommendations.push({
        type: 'performance_optimization',
        priority: 'medium',
        message: `High vector count (${analytics.totalVectorCount}) may impact query performance`,
        action: 'Consider aggressive archival thresholds'
      });
    }
    
    // Maintenance recommendations
    recommendations.push({
      type: 'maintenance',
      priority: 'low',
      message: 'Regular cleanup maintains optimal performance',
      action: 'Ensure automated cleanup is scheduled daily'
    });
    
    return recommendations;
  }

  /**
   * Get memory lifecycle analysis for an employee
   * @param {string} employeeId - Employee ID
   * @param {object} options - Analysis options
   * @returns {object} Lifecycle analysis
   */
  async getMemoryLifecycleAnalysis(employeeId, options = {}) {
    try {
      const memories = await this.vectorDb.getMemoriesForLifecycleAnalysis(employeeId, options);
      const storageStats = await this.getEmployeeStorageStats(employeeId);
      
      // Analyze memory distribution
      const memoryTypes = {
        experience: memories.filter(m => m.metadata?.memory_type === 'experience').length,
        knowledge: memories.filter(m => m.metadata?.memory_type === 'knowledge').length,
        decision: memories.filter(m => m.metadata?.memory_type === 'decision').length
      };
      
      // Analyze age distribution
      const now = Date.now();
      const ageDistribution = {
        recent: memories.filter(m => {
          const age = (now - new Date(m.metadata?.timestamp || now).getTime()) / (1000 * 60 * 60 * 24);
          return age <= 30;
        }).length,
        medium: memories.filter(m => {
          const age = (now - new Date(m.metadata?.timestamp || now).getTime()) / (1000 * 60 * 60 * 24);
          return age > 30 && age <= 90;
        }).length,
        old: memories.filter(m => {
          const age = (now - new Date(m.metadata?.timestamp || now).getTime()) / (1000 * 60 * 60 * 24);
          return age > 90;
        }).length
      };
      
      // Analyze importance distribution
      const importanceStats = {
        high: memories.filter(m => m.importanceScore >= 0.7).length,
        medium: memories.filter(m => m.importanceScore >= 0.4 && m.importanceScore < 0.7).length,
        low: memories.filter(m => m.importanceScore < 0.4).length,
        averageScore: memories.reduce((sum, m) => sum + m.importanceScore, 0) / memories.length
      };
      
      // Identify cleanup candidates
      const cleanupCandidates = memories.filter(memory => {
        const age = (now - new Date(memory.metadata?.timestamp || now).getTime()) / (1000 * 60 * 60 * 24);
        return age > 180 && memory.importanceScore < 0.3;
      });
      
      return {
        employeeId,
        analysis: {
          totalMemories: memories.length,
          memoryTypes,
          ageDistribution,
          importanceStats,
          cleanupCandidates: cleanupCandidates.length,
          storageStats,
          recommendations: this.generateMemoryRecommendations(memories, storageStats)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get lifecycle analysis for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Generate memory-specific recommendations
   * @param {Array} memories - Memory analysis results
   * @param {object} storageStats - Storage statistics
   * @returns {Array} Recommendations
   */
  generateMemoryRecommendations(memories, storageStats) {
    const recommendations = [];
    
    const now = Date.now();
    const oldMemories = memories.filter(m => {
      const age = (now - new Date(m.metadata?.timestamp || now).getTime()) / (1000 * 60 * 60 * 24);
      return age > 180;
    });
    
    const lowImportanceMemories = memories.filter(m => m.importanceScore < 0.3);
    
    if (storageStats.estimatedSizeMB > 100) {
      recommendations.push({
        type: 'urgent_cleanup',
        priority: 'high',
        message: `Storage (${storageStats.estimatedSizeMB.toFixed(1)}MB) exceeds target`,
        candidates: Math.min(oldMemories.length, lowImportanceMemories.length)
      });
    }
    
    if (oldMemories.length > 50) {
      recommendations.push({
        type: 'archive_old',
        priority: 'medium',
        message: `${oldMemories.length} memories older than 6 months`,
        action: 'Consider archiving old, low-importance memories'
      });
    }
    
    if (lowImportanceMemories.length > 100) {
      recommendations.push({
        type: 'cleanup_low_importance',
        priority: 'medium',
        message: `${lowImportanceMemories.length} low-importance memories found`,
        action: 'Archive memories with importance score < 0.3'
      });
    }
    
    return recommendations;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down Memory Management Service...');
      
      if (this.vectorDb) {
        await this.vectorDb.shutdown();
      }
      
      this.logger.info('Memory Management Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default MemoryManagementService;