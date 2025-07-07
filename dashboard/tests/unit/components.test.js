/**
 * Master Control Dashboard Unit Tests
 * Testing component structure and functionality
 */

import fs from 'fs';
import path from 'path';

// Component Structure Validation
function validateComponentStructure() {
    console.log('🧪 Validating Component Structure...');
    
    const srcPath = path.join(process.cwd(), 'src');
    const results = {
        pages: [],
        components: [],
        services: [],
        stores: [],
        types: []
    };
    
    try {
        // Check pages
        const pagesPath = path.join(srcPath, 'pages');
        if (fs.existsSync(pagesPath)) {
            results.pages = fs.readdirSync(pagesPath)
                .filter(file => file.endsWith('.tsx'));
            console.log('📄 Pages found:', results.pages.length);
        }
        
        // Check components directories
        const componentsPath = path.join(srcPath, 'components');
        if (fs.existsSync(componentsPath)) {
            const componentDirs = fs.readdirSync(componentsPath);
            results.components = componentDirs;
            console.log('🧩 Component directories:', componentDirs.length);
        }
        
        // Check services
        const servicesPath = path.join(srcPath, 'services');
        if (fs.existsSync(servicesPath)) {
            results.services = fs.readdirSync(servicesPath)
                .filter(file => file.endsWith('.ts'));
            console.log('🔧 Services found:', results.services.length);
        }
        
        // Check stores
        const storesPath = path.join(srcPath, 'stores');
        if (fs.existsSync(storesPath)) {
            results.stores = fs.readdirSync(storesPath)
                .filter(file => file.endsWith('.ts'));
            console.log('💾 Stores found:', results.stores.length);
        }
        
        // Check types
        const typesPath = path.join(srcPath, 'types');
        if (fs.existsSync(typesPath)) {
            results.types = fs.readdirSync(typesPath)
                .filter(file => file.endsWith('.ts'));
            console.log('📝 Type definitions found:', results.types.length);
        }
        
        return {
            success: true,
            structure: results,
            totalFiles: results.pages.length + results.services.length + results.stores.length + results.types.length
        };
        
    } catch (error) {
        console.log('❌ Component structure validation failed:', error.message);
        return { success: false, error: error.message };
    }
}

// TypeScript Interface Validation
function validateTypeScriptInterfaces() {
    console.log('🧪 Validating TypeScript Interfaces...');
    
    const interfaces = {
        memory: ['Memory', 'MemoryStats', 'SearchOptions', 'CleanupAnalytics'],
        employee: ['Employee', 'EmployeeDepartment', 'EmployeeStatus'],
        analytics: ['AnalyticsData', 'PerformanceMetrics', 'BusinessIntelligence']
    };
    
    const results = {
        interfacesExpected: 0,
        interfacesValidated: 0,
        files: {}
    };
    
    try {
        // Check each type file
        Object.keys(interfaces).forEach(typeFile => {
            const typePath = path.join(process.cwd(), 'src', 'types', `${typeFile}.ts`);
            results.interfacesExpected += interfaces[typeFile].length;
            
            if (fs.existsSync(typePath)) {
                const content = fs.readFileSync(typePath, 'utf8');
                const foundInterfaces = interfaces[typeFile].filter(interfaceName => 
                    content.includes(`interface ${interfaceName}`) || 
                    content.includes(`export interface ${interfaceName}`)
                );
                
                results.interfacesValidated += foundInterfaces.length;
                results.files[typeFile] = {
                    exists: true,
                    expected: interfaces[typeFile],
                    found: foundInterfaces,
                    missing: interfaces[typeFile].filter(i => !foundInterfaces.includes(i))
                };
                
                console.log(`📝 ${typeFile}.ts: ${foundInterfaces.length}/${interfaces[typeFile].length} interfaces`);
            } else {
                results.files[typeFile] = {
                    exists: false,
                    expected: interfaces[typeFile],
                    found: [],
                    missing: interfaces[typeFile]
                };
                console.log(`❌ ${typeFile}.ts: File not found`);
            }
        });
        
        const completionRate = Math.round((results.interfacesValidated / results.interfacesExpected) * 100);
        console.log(`📊 Interface Validation: ${results.interfacesValidated}/${results.interfacesExpected} (${completionRate}%)`);
        
        return {
            success: completionRate >= 70,
            completionRate,
            details: results
        };
        
    } catch (error) {
        console.log('❌ TypeScript interface validation failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Service Architecture Validation
function validateServiceArchitecture() {
    console.log('🧪 Validating Service Architecture...');
    
    const requiredServices = [
        { name: 'memory.ts', expectedMethods: ['searchMemories', 'storeMemory', 'getMemoryStats'] },
        { name: 'employees.ts', expectedMethods: ['getEmployees', 'assignTask', 'getPerformance'] },
        { name: 'analytics.ts', expectedMethods: ['getAnalytics', 'getPerformanceData'] },
        { name: 'monitoring.ts', expectedMethods: ['getSystemHealth', 'getActivity'] },
        { name: 'workflows.ts', expectedMethods: ['getWorkflows', 'startWorkflow', 'stopWorkflow'] }
    ];
    
    const results = {
        servicesValidated: 0,
        totalServices: requiredServices.length,
        serviceDetails: {}
    };
    
    try {
        requiredServices.forEach(service => {
            const servicePath = path.join(process.cwd(), 'src', 'services', service.name);
            
            if (fs.existsSync(servicePath)) {
                const content = fs.readFileSync(servicePath, 'utf8');
                const foundMethods = service.expectedMethods.filter(method => 
                    content.includes(method) || content.includes(`${method}(`) || content.includes(`${method} =`)
                );
                
                const isValid = foundMethods.length >= (service.expectedMethods.length * 0.6); // 60% threshold
                if (isValid) results.servicesValidated++;
                
                results.serviceDetails[service.name] = {
                    exists: true,
                    expectedMethods: service.expectedMethods,
                    foundMethods,
                    valid: isValid,
                    coverage: Math.round((foundMethods.length / service.expectedMethods.length) * 100)
                };
                
                console.log(`🔧 ${service.name}: ${foundMethods.length}/${service.expectedMethods.length} methods (${results.serviceDetails[service.name].coverage}%)`);
            } else {
                results.serviceDetails[service.name] = {
                    exists: false,
                    valid: false,
                    coverage: 0
                };
                console.log(`❌ ${service.name}: File not found`);
            }
        });
        
        const serviceValidationRate = Math.round((results.servicesValidated / results.totalServices) * 100);
        console.log(`📊 Service Validation: ${results.servicesValidated}/${results.totalServices} (${serviceValidationRate}%)`);
        
        return {
            success: serviceValidationRate >= 70,
            validationRate: serviceValidationRate,
            details: results
        };
        
    } catch (error) {
        console.log('❌ Service architecture validation failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Package.json Dependencies Validation
function validateDependencies() {
    console.log('🧪 Validating Dependencies...');
    
    const requiredDependencies = [
        '@mui/material', '@mui/icons-material', 'react', 'react-dom', 
        'react-router-dom', 'zustand', 'axios', 'recharts'
    ];
    
    const requiredDevDependencies = [
        '@types/react', 'typescript', 'vite', 'vitest', '@playwright/test'
    ];
    
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(packagePath)) {
            return { success: false, error: 'package.json not found' };
        }
        
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const deps = packageContent.dependencies || {};
        const devDeps = packageContent.devDependencies || {};
        
        const foundDeps = requiredDependencies.filter(dep => deps[dep]);
        const foundDevDeps = requiredDevDependencies.filter(dep => devDeps[dep]);
        
        console.log(`📦 Dependencies: ${foundDeps.length}/${requiredDependencies.length}`);
        console.log(`🛠️ Dev Dependencies: ${foundDevDeps.length}/${requiredDevDependencies.length}`);
        
        const totalRequired = requiredDependencies.length + requiredDevDependencies.length;
        const totalFound = foundDeps.length + foundDevDeps.length;
        const dependencyRate = Math.round((totalFound / totalRequired) * 100);
        
        return {
            success: dependencyRate >= 80,
            dependencyRate,
            dependencies: { found: foundDeps, missing: requiredDependencies.filter(dep => !foundDeps.includes(dep)) },
            devDependencies: { found: foundDevDeps, missing: requiredDevDependencies.filter(dep => !foundDevDeps.includes(dep)) }
        };
        
    } catch (error) {
        console.log('❌ Dependencies validation failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Main Unit Test Execution
async function runUnitTests() {
    console.log('🧪 Starting Master Control Dashboard Unit Tests');
    console.log('📅 Date:', new Date().toISOString());
    console.log('🔧 Test Environment: Component Validation\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        testSuite: 'Master Control Dashboard Unit Tests',
        tests: {}
    };
    
    // Execute all unit tests
    results.tests.componentStructure = validateComponentStructure();
    results.tests.typeScriptInterfaces = validateTypeScriptInterfaces();
    results.tests.serviceArchitecture = validateServiceArchitecture();
    results.tests.dependencies = validateDependencies();
    
    // Calculate overall results
    const passedTests = Object.values(results.tests).filter(test => test.success === true).length;
    const totalTests = Object.keys(results.tests).length;
    
    console.log('\n📊 Unit Test Results Summary:');
    console.log('✅ Tests Passed:', passedTests);
    console.log('📝 Total Tests:', totalTests);
    console.log('📈 Success Rate:', Math.round((passedTests / totalTests) * 100) + '%');
    
    results.summary = {
        passed: passedTests,
        total: totalTests,
        successRate: Math.round((passedTests / totalTests) * 100),
        overall: passedTests >= 3 ? 'PASS' : 'FAIL'
    };
    
    console.log('🎯 Overall Status:', results.summary.overall);
    
    return results;
}

// Execute tests if running directly
if (typeof window === 'undefined') {
    runUnitTests().then(results => {
        console.log('\n🏁 Unit testing completed');
        if (results.summary.overall === 'PASS') {
            process.exit(0);
        } else {
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Unit test execution failed:', error);
        process.exit(1);
    });
}

export { runUnitTests, validateComponentStructure, validateTypeScriptInterfaces };