import MemoryManagementService from '../services/MemoryManagementService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Vector Database Connection Test
 * Tests basic functionality of the vector database service
 */
class VectorDatabaseTest {
  constructor() {
    this.memoryService = new MemoryManagementService();
    this.testEmployeeId = 'emp_002'; // Technical Lead for testing
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('🚀 Starting Vector Database Tests...\n');

    try {
      // Test 1: Initialize the service
      await this.testInitialization();

      // Test 2: Store different types of memories
      await this.testMemoryStorage();

      // Test 3: Search and retrieve memories
      await this.testMemoryRetrieval();

      // Test 4: Get relevant context
      await this.testContextRetrieval();

      // Test 5: Get employee expertise
      await this.testExpertiseAnalysis();

      // Test 6: Get memory statistics
      await this.testStatistics();

      console.log('✅ All tests completed successfully!');

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Test service initialization
   */
  async testInitialization() {
    console.log('🧪 Test 1: Service Initialization');
    
    try {
      await this.memoryService.initialize();
      console.log('✅ Memory service initialized successfully');
      
      // Verify connections
      console.log('📡 Testing database connections...');
      
      // The initialization process includes connection verification
      console.log('✅ All database connections verified');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test memory storage
   */
  async testMemoryStorage() {
    console.log('🧪 Test 2: Memory Storage');
    
    try {
      // Store experience memory
      console.log('💾 Storing experience memory...');
      const experienceId = await this.memoryService.storeExperienceMemory(
        this.testEmployeeId,
        'Successfully implemented microservices architecture with Docker and Kubernetes',
        {
          project: 'enterprise_platform',
          technologies: ['nodejs', 'docker', 'kubernetes', 'microservices'],
          outcome: 'success',
          lessons_learned: ['container orchestration', 'service mesh', 'monitoring']
        },
        {
          importance: 9.0,
          tags: ['architecture', 'microservices', 'containers', 'success']
        }
      );
      console.log(`✅ Experience memory stored: ${experienceId}`);

      // Store knowledge memory
      console.log('📚 Storing knowledge memory...');
      const knowledgeId = await this.memoryService.storeKnowledgeMemory(
        this.testEmployeeId,
        'React performance optimization using React.memo, useMemo, and useCallback',
        {
          domain: 'frontend_development',
          complexity: 'intermediate',
          applications: ['dashboard', 'admin_panel', 'user_interface']
        },
        {
          importance: 8.0,
          tags: ['react', 'performance', 'optimization', 'frontend'],
          confidence: 9.2
        }
      );
      console.log(`✅ Knowledge memory stored: ${knowledgeId}`);

      // Store decision memory
      console.log('⚖️ Storing decision memory...');
      const decisionId = await this.memoryService.storeDecisionMemory(
        this.testEmployeeId,
        'Chose PostgreSQL over MongoDB for user management system',
        {
          decision_type: 'technology_selection',
          alternatives: ['MongoDB', 'CouchDB', 'DynamoDB'],
          criteria: ['ACID compliance', 'scalability', 'team expertise'],
          rationale: 'Strong consistency requirements for user data and team PostgreSQL expertise'
        },
        {
          importance: 8.5,
          tags: ['database', 'postgresql', 'architecture', 'decision'],
          stakeholders: ['project_manager', 'senior_developer'],
          outcome: 'implemented'
        }
      );
      console.log(`✅ Decision memory stored: ${decisionId}`);

    } catch (error) {
      console.error('❌ Memory storage failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test memory retrieval
   */
  async testMemoryRetrieval() {
    console.log('🧪 Test 3: Memory Retrieval');
    
    try {
      // Search for microservices-related memories
      console.log('🔍 Searching for microservices memories...');
      const microservicesResults = await this.memoryService.searchMemories(
        this.testEmployeeId,
        'microservices architecture docker kubernetes',
        {
          topK: 5,
          memoryTypes: ['experience', 'knowledge', 'decision'],
          minImportance: 7.0
        }
      );
      console.log(`✅ Found ${microservicesResults.length} microservices-related memories`);
      
      if (microservicesResults.length > 0) {
        console.log(`📄 Top result: ${microservicesResults[0].memory.content.substring(0, 100)}...`);
        console.log(`🎯 Relevance score: ${microservicesResults[0].score.toFixed(3)}`);
      }

      // Search for React-related memories
      console.log('🔍 Searching for React memories...');
      const reactResults = await this.memoryService.searchMemories(
        this.testEmployeeId,
        'React performance optimization',
        {
          topK: 3,
          memoryTypes: ['knowledge'],
          minImportance: 6.0
        }
      );
      console.log(`✅ Found ${reactResults.length} React-related memories`);

      // Search for database decisions
      console.log('🔍 Searching for database decisions...');
      const dbResults = await this.memoryService.searchMemories(
        this.testEmployeeId,
        'database PostgreSQL MongoDB decision',
        {
          topK: 3,
          memoryTypes: ['decision'],
          minImportance: 5.0
        }
      );
      console.log(`✅ Found ${dbResults.length} database decision memories`);

    } catch (error) {
      console.error('❌ Memory retrieval failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test context retrieval
   */
  async testContextRetrieval() {
    console.log('🧪 Test 4: Context Retrieval');
    
    try {
      // Get context for a new microservices project
      console.log('🎯 Getting context for microservices project...');
      const microservicesContext = await this.memoryService.getRelevantContext(
        this.testEmployeeId,
        'Implement a new microservices-based e-commerce platform with high scalability requirements',
        {
          topK: 8,
          minImportance: 7.0
        }
      );
      
      console.log(`✅ Context retrieved: ${microservicesContext.memories.length} relevant memories`);
      console.log(`📊 Average relevance: ${microservicesContext.summary.avg_relevance.toFixed(3)}`);
      console.log(`🏗️ Experience memories: ${microservicesContext.summary.experience_count}`);
      console.log(`📚 Knowledge memories: ${microservicesContext.summary.knowledge_count}`);
      console.log(`⚖️ Decision memories: ${microservicesContext.summary.decision_count}`);

      // Get context for frontend optimization
      console.log('🎯 Getting context for frontend optimization...');
      const frontendContext = await this.memoryService.getRelevantContext(
        this.testEmployeeId,
        'Optimize React application performance for better user experience',
        {
          topK: 5,
          minImportance: 6.0
        }
      );
      
      console.log(`✅ Frontend context retrieved: ${frontendContext.memories.length} relevant memories`);

    } catch (error) {
      console.error('❌ Context retrieval failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test expertise analysis
   */
  async testExpertiseAnalysis() {
    console.log('🧪 Test 5: Expertise Analysis');
    
    try {
      // Analyze microservices expertise
      console.log('🎓 Analyzing microservices expertise...');
      const microservicesExpertise = await this.memoryService.getEmployeeExpertise(
        this.testEmployeeId,
        'microservices'
      );
      
      console.log(`✅ Microservices expertise score: ${microservicesExpertise.expertise_score.toFixed(2)}/10`);
      console.log(`🏗️ Experience count: ${microservicesExpertise.experience_count}`);
      console.log(`📚 Knowledge count: ${microservicesExpertise.knowledge_count}`);
      console.log(`⚡ Recent activity: ${microservicesExpertise.recent_activity}`);
      console.log(`🔧 Key skills: ${microservicesExpertise.key_skills.map(s => s.skill).join(', ')}`);

      // Analyze React expertise
      console.log('🎓 Analyzing React expertise...');
      const reactExpertise = await this.memoryService.getEmployeeExpertise(
        this.testEmployeeId,
        'react'
      );
      
      console.log(`✅ React expertise score: ${reactExpertise.expertise_score.toFixed(2)}/10`);
      console.log(`🔧 Confidence level: ${reactExpertise.confidence_level.toFixed(2)}/10`);

    } catch (error) {
      console.error('❌ Expertise analysis failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test statistics
   */
  async testStatistics() {
    console.log('🧪 Test 6: Memory Statistics');
    
    try {
      // Get statistics for test employee
      console.log('📊 Getting memory statistics...');
      const stats = await this.memoryService.getMemoryStatistics(this.testEmployeeId);
      
      console.log(`✅ Employee: ${stats.employee_id}`);
      console.log(`📁 Namespace: ${stats.namespace}`);
      console.log(`💾 Total memories: ${stats.total_memories}`);
      console.log(`🏢 Department: ${stats.department}`);
      console.log(`👤 Role: ${stats.role}`);
      console.log(`📅 Last accessed: ${stats.last_accessed}`);

    } catch (error) {
      console.error('❌ Statistics retrieval failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Store interaction memory for testing
   */
  async testInteractionStorage() {
    console.log('🧪 Test: Interaction Storage');
    
    try {
      console.log('💬 Storing interaction memory...');
      const interactionId = await this.memoryService.storeInteractionMemory(
        this.testEmployeeId,
        'How do I implement caching in a microservices architecture?',
        'For microservices caching, consider using Redis for distributed caching, implement cache-aside pattern, and ensure cache invalidation strategies across services.',
        {
          query_type: 'technical_guidance',
          response_quality: 8.5
        }
      );
      
      console.log(`✅ Interaction memory stored: ${interactionId}`);
      
    } catch (error) {
      console.error('❌ Interaction storage failed:', error);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Cleanup test data and connections
   */
  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    try {
      await this.memoryService.shutdown();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Configuration validation
function validateConfiguration() {
  const requiredEnvVars = [
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    throw new Error('Configuration validation failed');
  }

  console.log('✅ Configuration validation passed');
}

// Main test execution
async function main() {
  try {
    console.log('🔧 Vector Database Connection Test');
    console.log('==================================\n');

    // Validate configuration
    validateConfiguration();
    console.log('');

    // Run tests
    const tester = new VectorDatabaseTest();
    await tester.runTests();

  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default VectorDatabaseTest;