const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const inputPath = 'Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv';
const outputPath = 'cleaned_astram_events.csv';

const records = [];

function parseDate(dateStr) {
    if (!dateStr || dateStr === 'NULL') return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch {
        return null;
    }
}

function parseBoolean(val) {
    if (typeof val === 'string') {
        const v = val.trim().toLowerCase();
        if (v === 'true' || v === '1' || v === 'yes') return 'TRUE';
        if (v === 'false' || v === '0' || v === 'no') return 'FALSE';
    }
    return 'FALSE'; // Default fallback
}

fs.createReadStream(inputPath)
    .pipe(csv())
    .on('data', (row) => {
        // 1. JSONB Consolidation for sparse fields
        const sparseFields = [
            'cargo_material', 'reason_breakdown', 'age_of_truck', 'route_path',
            'assigned_to_police_id', 'citizen_accident_id', 'resolved_at_address',
            'resolved_at_latitude', 'resolved_at_longitude', 'resolved_by_id',
            'resolved_datetime', 'direction', 'end_address'
        ];
        
        const eventDetails = {};
        for (const field of sparseFields) {
            if (row[field] && row[field] !== 'NULL' && row[field].trim() !== '') {
                eventDetails[field] = row[field];
            }
        }
        
        // 2. Geospatial Imputation
        let lat = row.latitude;
        let lng = row.longitude;
        let endLat = row.endlatitude;
        let endLng = row.endlongitude;
        
        if (!endLat || endLat === 'NULL' || endLat === '0') endLat = lat;
        if (!endLng || endLng === 'NULL' || endLng === '0') endLng = lng;

        // 3. Temporal Feature Engineering & Standardization
        const startDt = parseDate(row.start_datetime);
        const endDt = parseDate(row.end_datetime);
        const modifiedDt = parseDate(row.modified_datetime);
        const createdDt = parseDate(row.created_date);
        const closedDt = parseDate(row.closed_datetime);
        const resolvedDt = parseDate(row.resolved_datetime);

        let durationMins = 'NULL';
        if (startDt) {
            const fallbackDt = closedDt || resolvedDt || modifiedDt;
            if (fallbackDt) {
                const diffMs = new Date(fallbackDt).getTime() - new Date(startDt).getTime();
                durationMins = Math.max(0, Math.round(diffMs / 60000));
            }
        }

        // 4. Robust NULL Handling & Type Casting
        const ensureUnknown = (val) => (!val || val === 'NULL' || val.trim() === '' ? 'UNKNOWN' : val);
        const toUpper = (val) => (!val || val === 'NULL' || val.trim() === '' ? 'UNKNOWN' : val.trim().toUpperCase());
        
        const desc = row.description && row.description !== 'NULL' ? row.description : 'No description';
        
        // 5. NLP Feature Extraction (is_severe)
        const severeKeywords = ['fire', 'fatal', 'blocked', 'accident', 'dead', 'severe', 'spill', 'ಅಪಘಾತ', 'ಬೆಂಕಿ', 'ಬ್ಲಾಕ್', 'ಟ್ರಾಫಿಕ್ ಜಾಮ್', 'ವಾಹನ ಆಫ್'];
        const isSevere = severeKeywords.some(kw => desc.toLowerCase().includes(kw)) ? 'TRUE' : 'FALSE';

        const cleanedRow = {
            id: row.id,
            event_type: toUpper(row.event_type),
            latitude: lat,
            longitude: lng,
            endlatitude: endLat,
            endlongitude: endLng,
            address: ensureUnknown(row.address),
            event_cause: toUpper(row.event_cause),
            requires_road_closure: parseBoolean(row.requires_road_closure),
            start_datetime: startDt || 'NULL',
            end_datetime: endDt || 'NULL',
            status: toUpper(row.status),
            authenticated: parseBoolean(row.authenticated),
            modified_datetime: modifiedDt || 'NULL',
            description: desc,
            veh_type: ensureUnknown(row.veh_type),
            veh_no: ensureUnknown(row.veh_no),
            corridor: ensureUnknown(row.corridor),
            priority: toUpper(row.priority),
            created_date: createdDt || 'NULL',
            client_id: ensureUnknown(row.client_id),
            created_by_id: ensureUnknown(row.created_by_id),
            last_modified_by_id: ensureUnknown(row.last_modified_by_id),
            kgid: row.kgid === 'NULL' ? '' : row.kgid,
            closed_by_id: ensureUnknown(row.closed_by_id),
            closed_datetime: closedDt || 'NULL',
            gba_identifier: ensureUnknown(row.gba_identifier),
            zone: ensureUnknown(row.zone),
            junction: ensureUnknown(row.junction),
            event_details: JSON.stringify(eventDetails),
            duration_minutes: durationMins,
            is_severe: isSevere
        };

        records.push(cleanedRow);
    })
    .on('end', () => {
        if (records.length === 0) return;
        const csvWriter = createCsvWriter({
            path: outputPath,
            header: Object.keys(records[0]).map(k => ({id: k, title: k}))
        });
        
        csvWriter.writeRecords(records)
            .then(() => console.log('Cleaned CSV successfully generated:', outputPath))
            .catch(err => console.error('Error writing CSV:', err));
    });
