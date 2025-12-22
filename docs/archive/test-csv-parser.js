/**
 * Test CSV Parser Logic
 * Run with: node test-csv-parser.js
 */

const fs = require('fs');

// Read the CSV file
const csvText = fs.readFileSync('./test_guests.csv', 'utf8');

console.log('📄 CSV Content:');
console.log(csvText);
console.log('\n' + '='.repeat(80) + '\n');

// Parse CSV (same logic as GuestManagementScreen.js)
const parseCSV = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/);

  // Detect delimiter
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t')) delimiter = '\t';
  else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';
  else if (headerLine.includes('|') && !headerLine.includes(',')) delimiter = '|';

  console.log('📋 Detected delimiter:', delimiter === '\t' ? 'TAB' : delimiter);

  // Parse a line handling quoted fields
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  console.log('📋 Normalized headers:', headers);

  // Find column indices
  const findColumnIndex = (possibleNames) => {
    return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
  };

  const fullNameIndex = findColumnIndex(['fullname', 'name', 'guest', 'attendee', 'recipient', 'person']);
  const emailIndex = findColumnIndex(['email', 'mail', 'emailaddress']);
  const giftNameIndex = findColumnIndex(['gift', 'giftname', 'present', 'item', 'description', 'gifted', 'presents', 'giftfrom']);

  console.log('📋 Column mapping:');
  console.log('   Name column:', fullNameIndex, '→', headers[fullNameIndex]);
  console.log('   Email column:', emailIndex, '→', headers[emailIndex]);
  console.log('   Gift column:', giftNameIndex, '→', headers[giftNameIndex]);
  console.log('\n');

  // Parse data rows
  const parsedGuests = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseLine(line);
    const name = cols[fullNameIndex]?.trim() || '';
    const email = cols[emailIndex]?.trim() || '';
    const giftName = giftNameIndex !== -1 ? (cols[giftNameIndex] || '').trim() : null;

    console.log(`📦 Row ${i}:`, {
      name,
      email,
      giftNameIndex,
      giftName,
      rawGiftValue: cols[giftNameIndex],
      allColumns: cols
    });

    parsedGuests.push({ name, email, giftName });
  }

  return parsedGuests;
};

const guests = parseCSV(csvText);

console.log('\n' + '='.repeat(80));
console.log('✅ FINAL PARSED RESULTS:');
console.log('='.repeat(80) + '\n');

guests.forEach((guest, i) => {
  const finalGiftName = guest.giftName && guest.giftName.trim()
    ? guest.giftName
    : `Gift from ${guest.name}`;

  console.log(`Guest ${i + 1}:`);
  console.log(`  Name: ${guest.name}`);
  console.log(`  Email: ${guest.email}`);
  console.log(`  Parsed Gift Name: ${guest.giftName}`);
  console.log(`  Final Gift Name: ${finalGiftName}`);
  console.log(`  Has Gift Name: ${!!guest.giftName}`);
  console.log('');
});
