const fs = require('fs');
const data = JSON.parse(fs.readFileSync('fetch.json', 'utf-8'));
const rawTasks = data.tugasDef;

let parsedTasks = [];

if (Array.isArray(rawTasks) && rawTasks.length > 0) {
  // Check if standard headers exist
  const firstRow = rawTasks[0];
  const hasStandardHeaders = 
    ('jabatan' in firstRow || 'role' in firstRow) && 
    ('jenis' in firstRow || 'tipe' in firstRow) && 
    ('tugas' in firstRow || 'task' in firstRow);

  if (hasStandardHeaders) {
    parsedTasks = rawTasks.map(t => ({
      jabatan: t.jabatan || t.role || '',
      jenis: t.jenis || t.tipe || 'Harian',
      tugas: t.tugas || t.task || ''
    }));
  } else {
    // Malformed: user used data as headers
    // We need to extract the 3 unique original headers.
    // The original headers usually have uppercase letters or spaces.
    // Let's take the first 3 keys that don't look like the normalized ones.
    // Actually, backend sets obj[h.toString()] first. 
    // We can just find the unique string values of the first object's keys?
    // Let's just group by value? No, values are Row 2.
    // The keys themselves are Row 1.
    // Since backend does: obj[h.toString()] = val;
    // The first 3 unique keys are probably the original ones!
    const keys = Object.keys(firstRow);
    const originalKeys = [];
    
    // We know there are exactly 3 columns based on standard. But let's assume at least 3.
    // A simple heuristic: find keys that match exactly what's in the object, avoiding the lowercase/underscore ones if possible, but actually we can just take the first occurrence of each value.
    // Wait, the values of the first row are in the FIRST object.
    // No, the first object represents Row 2!
    // Its keys are Row 1.
    // Let's just take the first 3 keys that are distinct (not transformations of each other).
    const isTransformation = (a, b) => {
        const norm = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return norm(a) === norm(b);
    };

    for (let k of keys) {
        if (!originalKeys.some(ok => isTransformation(ok, k))) {
            originalKeys.push(k);
        }
    }
    
    // Now originalKeys contains the 3 original headers.
    if (originalKeys.length >= 3) {
      // Row 1
      parsedTasks.push({
        jabatan: originalKeys[0],
        jenis: originalKeys[1],
        tugas: originalKeys[2]
      });

      // Rows 2..N
      rawTasks.forEach(row => {
        parsedTasks.push({
          jabatan: row[originalKeys[0]],
          jenis: row[originalKeys[1]],
          tugas: row[originalKeys[2]]
        });
      });
    }
  }
}

console.log(parsedTasks.slice(0, 5));
