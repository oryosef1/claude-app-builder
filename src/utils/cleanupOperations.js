/**
 * Cleanup Operations Utilities
 * Helper functions for memory cleanup and lifecycle management
 */

/**
 * Generate cleanup recommendations based on analytics
 * @param {Object} analytics - Cleanup analytics
 * @returns {Array} Recommendations
 */
export function generateCleanupRecommendations(analytics) {
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
 * Generate memory-specific recommendations
 * @param {Array} memories - Memory analysis results
 * @param {Object} storageStats - Storage statistics
 * @returns {Array} Recommendations
 */
export function generateMemoryRecommendations(memories, storageStats) {
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
 * Perform company-wide cleanup with progress tracking
 * @param {Array} employees - Employee list
 * @param {Function} cleanupFunction - Individual cleanup function
 * @param {Object} options - Cleanup options
 * @param {Function} logger - Logger instance
 * @returns {Object} Aggregate results
 */
export async function performCompanyWideCleanup(employees, cleanupFunction, options = {}, logger) {
  logger.info(`Starting company-wide memory cleanup for ${employees.length} employees`);
  
  const results = [];
  let totalArchived = 0;
  let totalSavedMB = 0;
  let totalExecutionTime = 0;
  let successCount = 0;
  let errorCount = 0;
  
  for (const employeeId of employees) {
    try {
      const result = await cleanupFunction(employeeId, options);
      results.push(result);
      
      totalArchived += result.archival.archivedCount;
      totalSavedMB += result.storage.savedMB;
      totalExecutionTime += result.executionTimeMs;
      successCount++;
      
      // Small delay between employees to prevent overload
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`Cleanup failed for employee ${employeeId}:`, error);
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
  
  logger.info('Company-wide memory cleanup completed', {
    successful: successCount,
    failed: errorCount,
    totalArchived,
    totalSavedMB: totalSavedMB.toFixed(2)
  });
  
  return aggregateResults;
}

/**
 * Analyze memory lifecycle for an employee
 * @param {Array} memories - Memory list
 * @param {Object} storageStats - Storage statistics
 * @param {string} employeeId - Employee ID
 * @returns {Object} Lifecycle analysis
 */
export function analyzeMemoryLifecycle(memories, storageStats, employeeId) {
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
      recommendations: generateMemoryRecommendations(memories, storageStats)
    },
    timestamp: new Date().toISOString()
  };
}