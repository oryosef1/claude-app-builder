import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const coverageFile = path.join(__dirname, 'coverage/coverage-summary.json');
  const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
  
  console.log('\n=== Coverage Summary ===\n');
  console.log('File                           | Statements | Branches | Functions | Lines');
  console.log('-------------------------------|------------|----------|-----------|-------');
  
  Object.entries(coverage).forEach(([file, data]) => {
    if (file === 'total') {
      console.log('-------------------------------|------------|----------|-----------|-------');
    }
    
    const fileName = file === 'total' ? 'TOTAL' : path.basename(path.dirname(file)) + '/' + path.basename(file);
    const truncatedName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName.padEnd(30);
    
    console.log(
      `${truncatedName} | ${data.statements.pct.toFixed(1)}%`.padEnd(45) +
      `| ${data.branches.pct.toFixed(1)}%`.padEnd(11) +
      `| ${data.functions.pct.toFixed(1)}%`.padEnd(12) +
      `| ${data.lines.pct.toFixed(1)}%`
    );
  });
} catch (error) {
  console.error('Could not read coverage summary:', error.message);
}