/**
 * Employee Configuration
 * Centralized configuration for AI employees
 */

export const EMPLOYEES = [
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

export const DEPARTMENT_MAP = {
  'emp_001': 'Executive', 'emp_002': 'Executive', 'emp_003': 'Executive',
  'emp_004': 'Development', 'emp_005': 'Development', 'emp_006': 'Development', 'emp_007': 'Development',
  'emp_008': 'Operations', 'emp_009': 'Operations', 'emp_010': 'Operations',
  'emp_011': 'Support', 'emp_012': 'Support', 'emp_013': 'Support'
};

export const ROLE_MAP = {
  'emp_001': 'project_manager', 'emp_002': 'technical_lead', 'emp_003': 'qa_director',
  'emp_004': 'senior_developer', 'emp_005': 'junior_developer', 'emp_006': 'qa_engineer', 'emp_007': 'test_engineer',
  'emp_008': 'devops_engineer', 'emp_009': 'sre', 'emp_010': 'security_engineer',
  'emp_011': 'technical_writer', 'emp_012': 'ui_ux_designer', 'emp_013': 'build_engineer'
};

/**
 * Get employee department
 * @param {string} employeeId - Employee ID
 * @returns {string} Department name
 */
export function getEmployeeDepartment(employeeId) {
  return DEPARTMENT_MAP[employeeId] || 'Unknown';
}

/**
 * Get employee role
 * @param {string} employeeId - Employee ID
 * @returns {string} Role name
 */
export function getEmployeeRole(employeeId) {
  return ROLE_MAP[employeeId] || 'unknown';
}

/**
 * Get all employees for a department
 * @param {string} department - Department name
 * @returns {Array} Employee list
 */
export function getEmployeesByDepartment(department) {
  return EMPLOYEES.filter(emp => emp.department === department);
}

/**
 * Get employee by ID
 * @param {string} employeeId - Employee ID
 * @returns {Object|null} Employee object
 */
export function getEmployeeById(employeeId) {
  return EMPLOYEES.find(emp => emp.id === employeeId) || null;
}