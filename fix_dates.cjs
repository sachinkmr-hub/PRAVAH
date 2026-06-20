const fs = require('fs');

const file = 'cleaned_astram_events.csv';
const lines = fs.readFileSync(file, 'utf8').split('\n');

let updated = 0;
const newLines = lines.map((line, i) => {
    if (i === 0 || !line.trim()) return line;
    return line.replace(/2024-04-(\d{2})T(\d{2}:\d{2}:\d{2}\.\d{3}Z)/, (match, day, time) => {
        updated++;
        const dateObj = new Date(match);
        dateObj.setDate(dateObj.getDate() - 31);
        return dateObj.toISOString();
    });
});

fs.writeFileSync(file, newLines.join('\n'));
console.log(`Updated ${updated} future dates from April to March.`);
