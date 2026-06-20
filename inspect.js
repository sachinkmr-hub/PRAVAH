const fs = require('fs');
const csv = require('csv-parser');

const results = [];
let totalRows = 0;
const columnStats = {};

fs.createReadStream('Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv')
  .pipe(csv())
  .on('headers', (headers) => {
    headers.forEach(h => {
      columnStats[h] = { nulls: 0, uniques: new Set(), total: 0 };
    });
  })
  .on('data', (data) => {
    totalRows++;
    for (const key in data) {
      if (data[key] === 'NULL' || data[key] === '' || data[key] === null || data[key] === undefined) {
        columnStats[key].nulls++;
      } else {
        if (columnStats[key].uniques.size < 100) {
          columnStats[key].uniques.add(data[key]);
        }
      }
      columnStats[key].total++;
    }
  })
  .on('end', () => {
    console.log(`Total rows: ${totalRows}`);
    console.log('Column Stats:');
    for (const key in columnStats) {
      const stats = columnStats[key];
      const nullPerc = (stats.nulls / totalRows * 100).toFixed(2);
      console.log(`- ${key}: ${stats.nulls} nulls (${nullPerc}%), ${stats.uniques.size}${stats.uniques.size === 100 ? '+' : ''} unique values`);
    }
  });
