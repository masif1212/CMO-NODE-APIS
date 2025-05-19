const fs = require('fs');
const { ReportGenerator } = require('lighthouse/report/generator/report-generator.js');

const json = JSON.parse(fs.readFileSync('lighthouse-result.json', 'utf8'));
const html = ReportGenerator.generateReport(json, 'html');

fs.writeFileSync('report.html', html);
console.log('✅ Report generated: report.html');