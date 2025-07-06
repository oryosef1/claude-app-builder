#!/usr/bin/env node

/**
 * AI Employee Workflow Routing System
 * Routes tasks through appropriate AI employees based on project type and phase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WorkflowRouter {
    constructor() {
        this.registryPath = path.join(__dirname, 'employee-registry.json');
        this.workflowsPath = path.join(__dirname, 'workflow-definitions.json');
        this.employees = this.loadEmployees();
        this.workflows = this.loadWorkflows();
    }

    loadEmployees() {
        try {
            const data = fs.readFileSync(this.registryPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading employee registry:', error);
            return null;
        }
    }

    loadWorkflows() {
        try {
            const data = fs.readFileSync(this.workflowsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Create default workflow definitions
            const defaultWorkflows = this.createDefaultWorkflows();
            this.saveWorkflows(defaultWorkflows);
            return defaultWorkflows;
        }
    }

    saveWorkflows(workflows = this.workflows) {
        try {
            fs.writeFileSync(this.workflowsPath, JSON.stringify(workflows, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving workflow definitions:', error);
            return false;
        }
    }

    createDefaultWorkflows() {
        return {
            "software_development": {
                "name": "Software Development Project",
                "phases": [
                    {
                        "phase": "planning",
                        "required_roles": ["Project Manager"],
                        "optional_roles": ["Technical Lead"],
                        "parallel": false,
                        "deliverables": ["project_plan", "requirements", "timeline"]
                    },
                    {
                        "phase": "architecture",
                        "required_roles": ["Technical Lead"],
                        "optional_roles": ["Senior Developer", "Security Engineer"],
                        "parallel": false,
                        "deliverables": ["technical_architecture", "system_design", "technology_stack"]
                    },
                    {
                        "phase": "development",
                        "required_roles": ["Senior Developer"],
                        "optional_roles": ["Junior Developer"],
                        "parallel": true,
                        "deliverables": ["source_code", "unit_tests", "documentation"]
                    },
                    {
                        "phase": "testing",
                        "required_roles": ["QA Engineer"],
                        "optional_roles": ["Test Engineer"],
                        "parallel": true,
                        "deliverables": ["test_plan", "test_cases", "test_results"]
                    },
                    {
                        "phase": "deployment",
                        "required_roles": ["DevOps Engineer"],
                        "optional_roles": ["SRE"],
                        "parallel": false,
                        "deliverables": ["deployment_plan", "infrastructure", "monitoring"]
                    },
                    {
                        "phase": "documentation",
                        "required_roles": ["Technical Writer"],
                        "optional_roles": [],
                        "parallel": true,
                        "deliverables": ["user_docs", "api_docs", "maintenance_guide"]
                    }
                ]
            },
            "ui_ux_project": {
                "name": "UI/UX Design Project",
                "phases": [
                    {
                        "phase": "research",
                        "required_roles": ["UI/UX Designer"],
                        "optional_roles": ["Project Manager"],
                        "parallel": false,
                        "deliverables": ["user_research", "personas", "requirements"]
                    },
                    {
                        "phase": "design",
                        "required_roles": ["UI/UX Designer"],
                        "optional_roles": [],
                        "parallel": false,
                        "deliverables": ["wireframes", "mockups", "design_system"]
                    },
                    {
                        "phase": "prototyping",
                        "required_roles": ["UI/UX Designer"],
                        "optional_roles": ["Senior Developer"],
                        "parallel": false,
                        "deliverables": ["interactive_prototype", "usability_tests"]
                    },
                    {
                        "phase": "implementation",
                        "required_roles": ["Senior Developer"],
                        "optional_roles": ["Junior Developer"],
                        "parallel": true,
                        "deliverables": ["frontend_code", "responsive_design", "accessibility"]
                    }
                ]
            },
            "infrastructure_project": {
                "name": "Infrastructure Project",
                "phases": [
                    {
                        "phase": "planning",
                        "required_roles": ["DevOps Engineer"],
                        "optional_roles": ["Technical Lead", "Security Engineer"],
                        "parallel": false,
                        "deliverables": ["infrastructure_plan", "security_requirements", "capacity_planning"]
                    },
                    {
                        "phase": "implementation",
                        "required_roles": ["DevOps Engineer"],
                        "optional_roles": ["SRE"],
                        "parallel": false,
                        "deliverables": ["infrastructure_code", "automation_scripts", "ci_cd_pipeline"]
                    },
                    {
                        "phase": "security_review",
                        "required_roles": ["Security Engineer"],
                        "optional_roles": ["DevOps Engineer"],
                        "parallel": false,
                        "deliverables": ["security_audit", "vulnerability_assessment", "compliance_report"]
                    },
                    {
                        "phase": "monitoring",
                        "required_roles": ["SRE"],
                        "optional_roles": ["DevOps Engineer"],
                        "parallel": false,
                        "deliverables": ["monitoring_setup", "alerting_rules", "incident_response_plan"]
                    }
                ]
            },
            "quality_assurance": {
                "name": "Quality Assurance Project",
                "phases": [
                    {
                        "phase": "test_strategy",
                        "required_roles": ["QA Director"],
                        "optional_roles": ["QA Engineer"],
                        "parallel": false,
                        "deliverables": ["test_strategy", "quality_standards", "test_framework"]
                    },
                    {
                        "phase": "test_planning",
                        "required_roles": ["QA Engineer"],
                        "optional_roles": ["Test Engineer"],
                        "parallel": false,
                        "deliverables": ["test_plan", "test_cases", "test_data"]
                    },
                    {
                        "phase": "test_implementation",
                        "required_roles": ["Test Engineer"],
                        "optional_roles": ["QA Engineer"],
                        "parallel": true,
                        "deliverables": ["automated_tests", "manual_tests", "test_environments"]
                    },
                    {
                        "phase": "test_execution",
                        "required_roles": ["Test Engineer"],
                        "optional_roles": [],
                        "parallel": true,
                        "deliverables": ["test_results", "bug_reports", "quality_metrics"]
                    }
                ]
            }
        };
    }

    // Route a project through the appropriate workflow
    routeProject(projectData) {
        const workflowType = projectData.type || 'software_development';
        const workflow = this.workflows[workflowType];
        
        if (!workflow) {
            return { 
                success: false, 
                error: `Workflow type '${workflowType}' not found`,
                available_types: Object.keys(this.workflows)
            };
        }

        const routing = {
            project_id: projectData.id,
            project_name: projectData.name,
            workflow_type: workflowType,
            workflow_name: workflow.name,
            phases: [],
            estimated_duration: 0,
            required_employees: new Set(),
            optional_employees: new Set()
        };

        // Plan each phase
        for (const phase of workflow.phases) {
            const phaseRouting = this.planPhase(phase, projectData);
            routing.phases.push(phaseRouting);
            routing.estimated_duration += phaseRouting.estimated_duration;
            
            phaseRouting.assigned_employees.forEach(emp => routing.required_employees.add(emp.id));
            phaseRouting.optional_employees.forEach(emp => routing.optional_employees.add(emp.id));
        }

        routing.required_employees = Array.from(routing.required_employees);
        routing.optional_employees = Array.from(routing.optional_employees);

        return { success: true, routing: routing };
    }

    planPhase(phase, projectData) {
        const phaseRouting = {
            phase_name: phase.phase,
            required_roles: phase.required_roles,
            optional_roles: phase.optional_roles,
            parallel: phase.parallel,
            deliverables: phase.deliverables,
            assigned_employees: [],
            optional_employees: [],
            estimated_duration: this.estimatePhaseDuration(phase, projectData),
            dependencies: [],
            status: 'planned'
        };

        // Assign required roles
        for (const role of phase.required_roles) {
            const employee = this.findEmployeeByRole(role);
            if (employee) {
                phaseRouting.assigned_employees.push({
                    id: employee.id,
                    name: employee.name,
                    role: employee.role,
                    workload: employee.workload,
                    estimated_effort: this.estimateEmployeeEffort(employee, phase, projectData)
                });
            } else {
                phaseRouting.dependencies.push(`No available ${role} found`);
            }
        }

        // Assign optional roles if available and beneficial
        for (const role of phase.optional_roles) {
            const employee = this.findEmployeeByRole(role, true); // Allow higher workload for optional
            if (employee && employee.workload < 4) { // Only if not overloaded
                phaseRouting.optional_employees.push({
                    id: employee.id,
                    name: employee.name,
                    role: employee.role,
                    workload: employee.workload,
                    estimated_effort: this.estimateEmployeeEffort(employee, phase, projectData)
                });
            }
        }

        return phaseRouting;
    }

    findEmployeeByRole(targetRole, allowHigherWorkload = false) {
        const candidates = Object.values(this.employees.employees).filter(emp => {
            if (emp.status !== 'active') return false;
            if (emp.role !== targetRole) return false;
            if (!allowHigherWorkload && emp.workload >= 3) return false;
            return true;
        });

        if (candidates.length === 0) return null;

        // Sort by workload (prefer less busy employees)
        candidates.sort((a, b) => a.workload - b.workload);
        return candidates[0];
    }

    estimatePhaseDuration(phase, projectData) {
        const complexity = projectData.complexity || 'medium';
        const baseHours = {
            'planning': 16,
            'architecture': 24,
            'research': 16,
            'design': 32,
            'development': 80,
            'testing': 40,
            'deployment': 16,
            'documentation': 24,
            'prototyping': 32,
            'implementation': 60,
            'security_review': 16,
            'monitoring': 16,
            'test_strategy': 8,
            'test_planning': 16,
            'test_implementation': 32,
            'test_execution': 24
        };

        const multipliers = {
            'low': 0.7,
            'medium': 1.0,
            'high': 1.5,
            'very_high': 2.0
        };

        const base = baseHours[phase.phase] || 24;
        const multiplier = multipliers[complexity] || 1.0;
        
        return Math.round(base * multiplier);
    }

    estimateEmployeeEffort(employee, phase, projectData) {
        const baseDuration = this.estimatePhaseDuration(phase, projectData);
        
        // Adjust based on employee level and experience
        const levelMultipliers = {
            'Junior': 1.3,
            'Mid': 1.0,
            'Senior': 0.8
        };

        const multiplier = levelMultipliers[employee.level] || 1.0;
        return Math.round(baseDuration * multiplier);
    }

    // Execute next phase of a project
    executeNextPhase(projectId) {
        // This would integrate with the task assignment system
        // to actually assign tasks to employees for the next phase
        return {
            message: "Phase execution would integrate with task assignment system",
            next_step: "Implement integration with task-assignment.js"
        };
    }

    // Get workflow status for a project
    getWorkflowStatus(projectId) {
        // This would track the current status of a project's workflow
        return {
            message: "Workflow status tracking would be implemented here",
            next_step: "Add project state tracking"
        };
    }

    // Generate workflow recommendations
    generateWorkflowRecommendations(projectData) {
        const recommendations = [];
        
        // Analyze project requirements and suggest optimal workflow
        const complexity = projectData.complexity || 'medium';
        const timeline = projectData.timeline || 'normal';
        const teamSize = projectData.team_size || 'small';

        if (complexity === 'high' && timeline === 'urgent') {
            recommendations.push("Consider adding more senior developers to parallel development phases");
            recommendations.push("Implement continuous testing during development");
        }

        if (teamSize === 'large') {
            recommendations.push("Use parallel phases where possible to optimize team utilization");
            recommendations.push("Consider breaking project into smaller sub-projects");
        }

        if (projectData.type === 'software_development') {
            recommendations.push("Include security review in architecture phase for enterprise projects");
            recommendations.push("Plan for documentation phase to run in parallel with development");
        }

        return {
            project: projectData,
            recommendations: recommendations,
            suggested_optimizations: this.suggestWorkflowOptimizations(projectData)
        };
    }

    suggestWorkflowOptimizations(projectData) {
        const optimizations = [];

        // Suggest parallel phases where beneficial
        optimizations.push({
            type: "parallel_execution",
            description: "Run testing and documentation phases in parallel with development",
            estimated_time_savings: "20-30%"
        });

        // Suggest early involvement of specialists
        optimizations.push({
            type: "early_specialist_involvement",
            description: "Include DevOps and Security engineers in architecture phase",
            benefits: ["Reduced rework", "Better initial design", "Faster deployment"]
        });

        return optimizations;
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/workflow-router.js')) {
    const router = new WorkflowRouter();
    const command = process.argv[2];

    switch (command) {
        case 'route':
            const projectFile = process.argv[3];
            if (!projectFile) {
                console.error('Usage: node workflow-router.js route <project.json>');
                process.exit(1);
            }
            try {
                const projectData = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
                const result = router.routeProject(projectData);
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
            break;

        case 'workflows':
            console.log(JSON.stringify(router.workflows, null, 2));
            break;

        case 'recommend':
            const projectFileRec = process.argv[3];
            if (!projectFileRec) {
                console.error('Usage: node workflow-router.js recommend <project.json>');
                process.exit(1);
            }
            try {
                const projectData = JSON.parse(fs.readFileSync(projectFileRec, 'utf8'));
                const result = router.generateWorkflowRecommendations(projectData);
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
            break;

        default:
            console.log(`
AI Employee Workflow Routing System

Commands:
  route <project.json>        - Route project through appropriate workflow
  workflows                   - List available workflow definitions
  recommend <project.json>    - Generate workflow recommendations

Examples:
  node workflow-router.js route example-project.json
  node workflow-router.js workflows
  node workflow-router.js recommend project.json
            `);
    }
}

export default WorkflowRouter;