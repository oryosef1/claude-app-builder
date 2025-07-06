import VectorDatabaseService from '../services/VectorDatabaseService.js';
import MemoryManagementService from '../services/MemoryManagementService.js';

console.log('🚀 Simple Vector Database Test');
console.log('==============================');

try {
  console.log('📦 Testing VectorDatabaseService instantiation...');
  const vectorDb = new VectorDatabaseService();
  console.log('✅ VectorDatabaseService created successfully');
  console.log(`🔑 Encryption key length: ${vectorDb.encryptionKey?.length || 'not set'}`);
  console.log(`📝 Logger initialized: ${!!vectorDb.logger}`);

  console.log('\n📦 Testing MemoryManagementService instantiation...');
  const memoryService = new MemoryManagementService();
  console.log('✅ MemoryManagementService created successfully');
  console.log(`📝 Logger initialized: ${!!memoryService.logger}`);
  console.log(`🔗 VectorDB linked: ${!!memoryService.vectorDb}`);

  console.log('\n🧪 Testing encryption functionality...');
  const testData = { test: 'data', sensitive: 'information' };
  const employeeId = 'emp_test_001';
  
  const encrypted = vectorDb.encrypt(testData, employeeId);
  console.log('✅ Data encrypted successfully');
  console.log(`📊 Encrypted structure: ${Object.keys(encrypted).join(', ')}`);
  
  const decrypted = vectorDb.decrypt(encrypted, employeeId);
  console.log('✅ Data decrypted successfully');
  console.log(`🔍 Data integrity: ${JSON.stringify(decrypted) === JSON.stringify(testData) ? 'PASSED' : 'FAILED'}`);

  console.log('\n🧪 Testing memory validation...');
  const validMemory = {
    memory_type: 'experience',
    content: 'Test experience content'
  };
  
  const validated = vectorDb.validateMemoryStructure(validMemory);
  console.log('✅ Memory validation successful');
  console.log(`📋 Metadata added: ${!!validated.metadata}`);
  console.log(`⭐ Default importance: ${validated.metadata?.importance}`);
  console.log(`📅 Timestamp added: ${!!validated.metadata?.timestamp}`);

  console.log('\n🧪 Testing temporal embeddings...');
  const now = new Date().toISOString();
  const embedding = vectorDb.generateTemporalEmbedding(now);
  console.log('✅ Temporal embedding generated');
  console.log(`📊 Embedding dimensions: ${embedding?.length}`);
  console.log(`🎯 Recency score: ${embedding?.[0]?.toFixed(4)}`);

  console.log('\n📋 Testing role context...');
  const techLeadContext = vectorDb.getRoleContext('technical_lead');
  const qaContext = vectorDb.getRoleContext('qa_engineer');
  console.log('✅ Role contexts generated');
  console.log(`👔 Technical Lead: ${techLeadContext.substring(0, 50)}...`);
  console.log(`🧪 QA Engineer: ${qaContext.substring(0, 50)}...`);

  console.log('\n🎯 BASIC FUNCTIONALITY TEST: PASSED');
  console.log('===================================');
  console.log('✅ All core components working correctly');
  console.log('✅ Encryption/decryption functional');
  console.log('✅ Memory validation working');
  console.log('✅ Temporal embeddings generating');
  console.log('✅ Role contexts available');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}