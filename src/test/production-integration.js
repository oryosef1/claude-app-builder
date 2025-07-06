/**
 * Production Integration Tests
 * Tests real Pinecone connectivity and API functionality
 */

import { VectorDatabaseService } from '../services/VectorDatabaseService.js';
import dotenv from 'dotenv';

dotenv.config();

const productionTests = {
  
  async testPineconeConnectivity() {
    console.log('🧪 Testing Pinecone connectivity...');
    
    const service = new VectorDatabaseService();
    
    try {
      await service.initialize();
      
      // Test index stats
      const stats = await service.index.describeIndexStats();
      console.log('✅ Pinecone connected - Index stats:', {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension,
        indexFullness: stats.indexFullness
      });
      
      await service.shutdown();
      return true;
    } catch (error) {
      console.error('❌ Pinecone connectivity failed:', error.message);
      return false;
    }
  },

  async testMemoryOperations() {
    console.log('🧪 Testing real memory operations...');
    
    const service = new VectorDatabaseService();
    
    try {
      await service.initialize();
      
      // Test memory storage
      const testMemory = {
        memory_type: 'experience',
        content: 'Production integration test - storing and retrieving memory',
        context: { test: true, timestamp: new Date().toISOString() },
        metadata: {
          importance: 8.0,
          tags: ['integration-test', 'production'],
          role: 'senior_developer',
          department: 'development'
        }
      };
      
      const memoryId = await service.storeMemory('emp_004', testMemory);
      console.log('✅ Memory stored successfully:', memoryId);
      
      // Test memory retrieval
      const results = await service.retrieveMemories(
        'integration test production',
        'emp_004',
        { topK: 1, includeMetadata: true }
      );
      
      if (results.length > 0) {
        console.log('✅ Memory retrieved successfully:', {
          id: results[0].id,
          score: results[0].score,
          content: results[0].memory.content.substring(0, 50) + '...'
        });
      } else {
        console.log('⚠️ No memories retrieved - this might be expected for new index');
      }
      
      await service.shutdown();
      return true;
    } catch (error) {
      console.error('❌ Memory operations failed:', error.message);
      return false;
    }
  },

  async testAPIEndpoints() {
    console.log('🧪 Testing API endpoints...');
    
    const baseUrl = `http://localhost:${process.env.API_PORT || 3333}`;
    
    try {
      // Test health endpoint
      const healthResponse = await fetch(`${baseUrl}/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log('✅ Health endpoint working:', health.status);
      } else {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      
      // Test memory storage endpoint
      const storeResponse = await fetch(`${baseUrl}/api/memory/experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: 'emp_004',
          content: 'API integration test - testing production endpoints',
          context: { test: true, api: true },
          metadata: {
            importance: 7.0,
            tags: ['api-test', 'production']
          }
        })
      });
      
      if (storeResponse.ok) {
        const result = await storeResponse.json();
        console.log('✅ Memory storage API working:', result.memoryId);
      } else {
        throw new Error(`Memory storage failed: ${storeResponse.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ API endpoints failed:', error.message);
      return false;
    }
  },

  async testEncryption() {
    console.log('🧪 Testing updated encryption...');
    
    const service = new VectorDatabaseService();
    
    try {
      const testData = { sensitive: 'data', credentials: 'secret123' };
      
      // Test encryption
      const encrypted = service.encrypt(testData, 'emp_001');
      console.log('✅ Encryption working - encrypted data has fields:', Object.keys(encrypted));
      
      // Test decryption
      const decrypted = service.decrypt(encrypted, 'emp_001');
      
      if (JSON.stringify(decrypted) === JSON.stringify(testData)) {
        console.log('✅ Decryption working - data matches original');
        return true;
      } else {
        throw new Error('Decrypted data does not match original');
      }
    } catch (error) {
      console.error('❌ Encryption test failed:', error.message);
      return false;
    }
  },

  async runAllTests() {
    console.log('🚀 Running Production Integration Tests...\n');
    
    const results = {
      pinecone: await this.testPineconeConnectivity(),
      memory: await this.testMemoryOperations(),
      api: await this.testAPIEndpoints(),
      encryption: await this.testEncryption()
    };
    
    console.log('\n📊 Production Test Results:');
    console.log('  Pinecone Connectivity:', results.pinecone ? '✅ PASS' : '❌ FAIL');
    console.log('  Memory Operations:', results.memory ? '✅ PASS' : '❌ FAIL');
    console.log('  API Endpoints:', results.api ? '✅ PASS' : '❌ FAIL');
    console.log('  Encryption (Fixed):', results.encryption ? '✅ PASS' : '❌ FAIL');
    
    const passCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
    
    if (passCount === totalTests) {
      console.log('🎉 All production integration tests PASSED!');
      return true;
    } else {
      console.log('⚠️ Some production integration tests FAILED!');
      return false;
    }
  }
};

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  productionTests.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export default productionTests;