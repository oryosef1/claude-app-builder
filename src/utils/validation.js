/**
 * Input Validation Utilities
 * Validation functions for API endpoints
 */

/**
 * Validate employee ID format
 * @param {string} employeeId - Employee ID to validate
 * @returns {boolean} True if valid
 */
export function isValidEmployeeId(employeeId) {
  if (typeof employeeId !== 'string') return false;
  
  // Should match pattern emp_001 to emp_013
  const pattern = /^emp_0(0[1-9]|1[0-3])$/;
  return pattern.test(employeeId);
}

/**
 * Validate memory content
 * @param {string} content - Content to validate
 * @returns {boolean} True if valid
 */
export function isValidContent(content) {
  if (typeof content !== 'string') return false;
  if (content.trim().length === 0) return false;
  if (content.length > 10000) return false; // Max 10k characters
  
  return true;
}

/**
 * Validate context object
 * @param {object} context - Context to validate
 * @returns {boolean} True if valid
 */
export function isValidContext(context) {
  if (context === null || context === undefined) return true; // Optional
  if (typeof context !== 'object') return false;
  if (Array.isArray(context)) return false;
  
  // Check for dangerous properties
  const dangerousProps = ['__proto__', 'constructor', 'prototype'];
  for (const prop of dangerousProps) {
    if (context.hasOwnProperty(prop)) return false;
  }
  
  return true;
}

/**
 * Validate metadata object
 * @param {object} metadata - Metadata to validate
 * @returns {boolean} True if valid
 */
export function isValidMetadata(metadata) {
  if (metadata === null || metadata === undefined) return true; // Optional
  if (typeof metadata !== 'object') return false;
  if (Array.isArray(metadata)) return false;
  
  // Validate importance if present
  if (metadata.importance !== undefined) {
    if (typeof metadata.importance !== 'number') return false;
    if (metadata.importance < 0 || metadata.importance > 10) return false;
  }
  
  // Validate tags if present
  if (metadata.tags !== undefined) {
    if (!Array.isArray(metadata.tags)) return false;
    if (metadata.tags.length > 20) return false; // Max 20 tags
    for (const tag of metadata.tags) {
      if (typeof tag !== 'string' || tag.length > 50) return false; // Max 50 chars per tag
    }
  }
  
  return true;
}

/**
 * Validate search query
 * @param {string} query - Search query to validate
 * @returns {boolean} True if valid
 */
export function isValidQuery(query) {
  if (typeof query !== 'string') return false;
  if (query.trim().length === 0) return false;
  if (query.length > 1000) return false; // Max 1k characters
  
  return true;
}

/**
 * Validate search options
 * @param {object} options - Search options to validate
 * @returns {boolean} True if valid
 */
export function isValidSearchOptions(options) {
  if (options === null || options === undefined) return true; // Optional
  if (typeof options !== 'object') return false;
  if (Array.isArray(options)) return false;
  
  // Validate topK if present
  if (options.topK !== undefined) {
    if (!Number.isInteger(options.topK)) return false;
    if (options.topK < 1 || options.topK > 100) return false; // 1-100 results
  }
  
  // Validate minImportance if present
  if (options.minImportance !== undefined) {
    if (typeof options.minImportance !== 'number') return false;
    if (options.minImportance < 0 || options.minImportance > 10) return false;
  }
  
  return true;
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Validate memory creation request
 * @param {object} req - Express request object
 * @returns {object} Validation result
 */
export function validateMemoryRequest(req) {
  const { employeeId, content, context, metadata } = req.body;
  
  const errors = [];
  
  // Required fields
  if (!employeeId) {
    errors.push('employeeId is required');
  } else if (!isValidEmployeeId(employeeId)) {
    errors.push('employeeId must be in format emp_001 to emp_013');
  }
  
  if (!content) {
    errors.push('content is required');
  } else if (!isValidContent(content)) {
    errors.push('content must be a non-empty string (max 10,000 characters)');
  }
  
  // Optional fields
  if (context !== undefined && !isValidContext(context)) {
    errors.push('context must be a valid object');
  }
  
  if (metadata !== undefined && !isValidMetadata(metadata)) {
    errors.push('metadata must be a valid object with proper importance (0-10) and tags');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate search request
 * @param {object} req - Express request object
 * @returns {object} Validation result
 */
export function validateSearchRequest(req) {
  const { employeeId, query, options } = req.body;
  
  const errors = [];
  
  // Required fields
  if (!employeeId) {
    errors.push('employeeId is required');
  } else if (!isValidEmployeeId(employeeId)) {
    errors.push('employeeId must be in format emp_001 to emp_013');
  }
  
  if (!query) {
    errors.push('query is required');
  } else if (!isValidQuery(query)) {
    errors.push('query must be a non-empty string (max 1,000 characters)');
  }
  
  // Optional fields
  if (options !== undefined && !isValidSearchOptions(options)) {
    errors.push('options must be a valid object with proper topK (1-100) and minImportance (0-10)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Create validation middleware
 * @param {function} validator - Validation function
 * @returns {function} Express middleware
 */
export function createValidationMiddleware(validator) {
  return (req, res, next) => {
    try {
      const result = validator(req);
      
      if (!result.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors
        });
      }
      
      // Sanitize string inputs
      if (req.body.content) {
        req.body.content = sanitizeString(req.body.content);
      }
      if (req.body.query) {
        req.body.query = sanitizeString(req.body.query);
      }
      
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Invalid request format',
        details: [error.message]
      });
    }
  };
}