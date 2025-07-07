const express = require('express');
const axios = require('axios');
const path = require('path');

const router = express.Router();

// Memory API configuration
const MEMORY_API_URL = 'http://localhost:3333/api/memory';

/**
 * Proxy to Memory API with error handling and logging
 */
async function proxyToMemoryAPI(endpoint, method = 'GET', data = null, params = {}) {
  try {
    const config = {
      method,
      url: `${MEMORY_API_URL}${endpoint}`,
      timeout: 10000,
      params
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Search memories
 */
router.post('/search', async (req, res) => {
  try {
    const searchData = {
      employeeId: req.body.employeeId,
      query: req.body.query,
      limit: req.body.limit || 5,
      memoryTypes: req.body.memoryTypes || ['experience', 'knowledge', 'decision'],
      relevanceThreshold: req.body.relevanceThreshold || 0.7
    };

    const result = await proxyToMemoryAPI('/search', 'POST', searchData);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Memory search failed',
      details: error.message
    });
  }
});

/**
 * Get memory context for task
 */
router.post('/context', async (req, res) => {
  try {
    const contextData = {
      employeeId: req.body.employeeId,
      taskDescription: req.body.taskDescription,
      limit: req.body.limit || 5,
      memoryTypes: req.body.memoryTypes || ['experience', 'knowledge', 'decision'],
      relevanceThreshold: req.body.relevanceThreshold || 0.7,
      timeRange: req.body.timeRange || 30 // days
    };

    const result = await proxyToMemoryAPI('/context', 'POST', contextData);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Context loading failed',
      details: error.message
    });
  }
});

/**
 * Store new memory
 */
router.post('/store', async (req, res) => {
  try {
    const { type, employeeId, content, metadata = {} } = req.body;

    if (!type || !employeeId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, employeeId, content'
      });
    }

    const endpoint = type === 'experience' ? '/experience' :
                    type === 'knowledge' ? '/knowledge' :
                    type === 'decision' ? '/decision' : '/interaction';

    const memoryData = {
      employeeId,
      content,
      metadata: {
        ...metadata,
        source: 'dashboard',
        timestamp: new Date().toISOString()
      }
    };

    const result = await proxyToMemoryAPI(endpoint, 'POST', memoryData);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('memory', {
        type: 'memory_stored',
        employeeId: employeeId,
        memoryType: type,
        memoryId: result.data?.id
      });
    }

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Memory storage failed',
      details: error.message
    });
  }
});

/**
 * Get employee memory statistics
 */
router.get('/stats/:employeeId', async (req, res) => {
  try {
    const result = await proxyToMemoryAPI(`/stats/${req.params.employeeId}`);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get memory statistics',
      details: error.message
    });
  }
});

/**
 * Get employee expertise analysis
 */
router.get('/expertise/:employeeId/:domain', async (req, res) => {
  try {
    const result = await proxyToMemoryAPI(`/expertise/${req.params.employeeId}/${req.params.domain}`);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get expertise analysis',
      details: error.message
    });
  }
});

/**
 * Archive memories
 */
router.post('/archive', async (req, res) => {
  try {
    const archiveData = {
      memoryIds: req.body.memoryIds || [],
      employeeId: req.body.employeeId,
      reason: req.body.reason || 'Manual archive',
      retentionDays: req.body.retentionDays || 180
    };

    const result = await proxyToMemoryAPI('/archive', 'POST', archiveData);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('memory', {
        type: 'memories_archived',
        employeeId: archiveData.employeeId,
        count: archiveData.memoryIds.length
      });
    }

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Memory archival failed',
      details: error.message
    });
  }
});

/**
 * Restore archived memories
 */
router.post('/restore', async (req, res) => {
  try {
    const restoreData = {
      memoryIds: req.body.memoryIds || [],
      employeeId: req.body.employeeId,
      reason: req.body.reason || 'Manual restore'
    };

    const result = await proxyToMemoryAPI('/restore', 'POST', restoreData);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('memory', {
        type: 'memories_restored',
        employeeId: restoreData.employeeId,
        count: restoreData.memoryIds.length
      });
    }

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Memory restoration failed',
      details: error.message
    });
  }
});

/**
 * Cleanup employee memories
 */
router.post('/cleanup/:employeeId', async (req, res) => {
  try {
    const cleanupData = {
      dryRun: req.body.dryRun || false,
      maxMemories: req.body.maxMemories || 1000,
      minImportanceScore: req.body.minImportanceScore || 0.3,
      maxAge: req.body.maxAge || 180 // days
    };

    const result = await proxyToMemoryAPI(`/cleanup/${req.params.employeeId}`, 'POST', cleanupData);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('memory', {
        type: 'memory_cleanup',
        employeeId: req.params.employeeId,
        result: result.data
      });
    }

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Memory cleanup failed',
      details: error.message
    });
  }
});

/**
 * Get cleanup analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const result = await proxyToMemoryAPI('/analytics');

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cleanup analytics',
      details: error.message
    });
  }
});

/**
 * Get memory lifecycle analysis
 */
router.get('/lifecycle/:employeeId', async (req, res) => {
  try {
    const result = await proxyToMemoryAPI(`/lifecycle/${req.params.employeeId}`);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get lifecycle analysis',
      details: error.message
    });
  }
});

/**
 * Get storage statistics
 */
router.get('/storage/:employeeId', async (req, res) => {
  try {
    const result = await proxyToMemoryAPI(`/storage/${req.params.employeeId}`);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get storage statistics',
      details: error.message
    });
  }
});

/**
 * Schedule automated cleanup
 */
router.post('/schedule', async (req, res) => {
  try {
    const scheduleData = {
      employeeId: req.body.employeeId,
      schedule: req.body.schedule || 'daily',
      enabled: req.body.enabled !== false,
      configuration: req.body.configuration || {}
    };

    const result = await proxyToMemoryAPI('/schedule', 'POST', scheduleData);

    res.status(result.status).json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to schedule cleanup',
      details: error.message
    });
  }
});

module.exports = router;