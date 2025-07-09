/**
 * Memory Operations Utilities
 * Helper functions for memory processing and analysis
 */

/**
 * Post-process search results
 * @param {Array} results - Raw search results
 * @param {Object} options - Processing options
 * @returns {Array} Processed results
 */
export function postProcessResults(results, options) {
  let processedResults = results;

  // Sort by relevance score
  processedResults.sort((a, b) => b.score - a.score);

  // Apply time-based boosting if requested
  if (options.boostRecent) {
    processedResults = applyTimeBasedBoosting(processedResults);
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
 * @param {Array} results - Search results
 * @returns {Array} Boosted results
 */
export function applyTimeBasedBoosting(results) {
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
 * @param {Array} memories - Memory results
 * @param {string} taskDescription - Task description
 * @returns {Array} Ranked memories
 */
export function rankMemoriesByRelevance(memories, taskDescription) {
  return memories.map(memory => {
    // Calculate relevance score based on multiple factors
    const baseScore = memory.score;
    const importanceScore = memory.memory.metadata.importance / 10;
    const typeScore = getMemoryTypeScore(memory.memory.memory_type, taskDescription);
    const recencyScore = getRecencyScore(memory.memory.metadata.timestamp);
    
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
 * @returns {number} Type score
 */
export function getMemoryTypeScore(memoryType, taskDescription) {
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
 * @returns {number} Recency score
 */
export function getRecencyScore(timestamp) {
  const now = new Date();
  const memoryDate = new Date(timestamp);
  const daysSinceCreation = (now - memoryDate) / (1000 * 60 * 60 * 24);
  
  // Exponential decay with 30-day half-life
  return Math.exp(-daysSinceCreation / 30);
}

/**
 * Generate context summary from memories
 * @param {Array} memories - Ranked memories
 * @param {string} taskDescription - Task description
 * @returns {Object} Context summary
 */
export function generateContextSummary(memories, taskDescription) {
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
 * @param {Array} memories - Relevant memories
 * @param {string} domain - Domain name
 * @returns {Object} Expertise metrics
 */
export function calculateExpertiseMetrics(memories, domain) {
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