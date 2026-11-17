const fs = require('fs');

let content = fs.readFileSync('pages/Salary.tsx', 'utf8');

// The section starts around 2500
const slipStartIndex = content.indexOf('<div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>');

if (slipStartIndex === -1) {
  console.log("Could not find slip start");
  process.exit(1);
}

const beforeSlip = content.substring(0, slipStartIndex);
let slipStr = content.substring(slipStartIndex);

// Replace fontWeights
slipStr = slipStr.replace(/fontWeight: "600"/g, 'fontWeight: "500"');
slipStr = slipStr.replace(/fontWeight: "700"/g, 'fontWeight: "500"');
slipStr = slipStr.replace(/fontWeight: "800"/g, 'fontWeight: "500"');
slipStr = slipStr.replace(/fontWeight: "bold"/gi, 'fontWeight: "500"');

// Fix Manager / Finance to HR / Finance
slipStr = slipStr.replace(/>Manager \/ Finance</g, '>HR / Finance<');

// Fix Table 1 (Nama & Jabatan) and Table 2 (Tanggal Cetak & Status)
// Nama
slipStr = slipStr.replace(
  /<tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px" }}>Nama<\/td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827" }}>: {user\?\.nama \|\| "Karyawan"}<\/td><\/tr>/g,
  '<tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Nama</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827", verticalAlign: "top" }}>{user?.nama || "Karyawan"}</td></tr>'
);

// Jabatan
slipStr = slipStr.replace(
  /<tr><td style={{ padding: "4px 0", color: "#6b7280" }}>Jabatan<\/td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827" }}>: {salaryData\.jabatan \|\| "-"}<\/td><\/tr>/g,
  '<tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Jabatan</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827", verticalAlign: "top" }}>{salaryData.jabatan || "-"}</td></tr>'
);

// Tanggal Cetak
slipStr = slipStr.replace(
  /<tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px" }}>Tanggal Cetak<\/td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827" }}>: {new Date\(\)\.toLocaleDateString\('id-ID'\)}<\/td><\/tr>/g,
  '<tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Tanggal Cetak</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827", verticalAlign: "top" }}>{new Date().toLocaleDateString(\'id-ID\')}</td></tr>'
);

// Status
slipStr = slipStr.replace(
  /<tr><td style={{ padding: "4px 0", color: "#6b7280" }}>Status<\/td><td style={{ padding: "4px 0", fontWeight: "500", color: "#059669" }}>: CONFIDENTIAL<\/td><\/tr>/g,
  '<tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Status</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#059669", verticalAlign: "top" }}>CONFIDENTIAL</td></tr>'
);

// Swap Rincian Potongan and Rincian Pendapatan blocks.
// I will extract them both and then reconstruct the flex container.
const containerStartStr = '<div style={{ display: "flex", gap: "40px", marginBottom: "30px" }}>';
const containerStartIdx = slipStr.indexOf(containerStartStr);
if (containerStartIdx > -1) {
  // Let's use regex to find the two flex items.
  // Actually, since there are exactly two `<div style={{ flex: 1 }}>` blocks inside this container...
  const flex1Start = '<div style={{ flex: 1 }}>';
  const flex1FirstIdx = slipStr.indexOf(flex1Start, containerStartIdx);
  const flex1SecondIdx = slipStr.indexOf(flex1Start, flex1FirstIdx + 1);
  const containerEndIdx = slipStr.indexOf('</div>', slipStr.indexOf('</table>', flex1SecondIdx)) + 6; // Actually, the flex item ends after </table></div>. We need the container end too.

  if (flex1FirstIdx > -1 && flex1SecondIdx > -1) {
    const firstBlockEnd = slipStr.indexOf('</div>', slipStr.indexOf('</table>', flex1FirstIdx)) + 6;
    const firstBlock = slipStr.substring(flex1FirstIdx, firstBlockEnd);

    const secondBlockEnd = slipStr.indexOf('</div>', slipStr.indexOf('</table>', flex1SecondIdx)) + 6;
    const secondBlock = slipStr.substring(flex1SecondIdx, secondBlockEnd);

    // Ensure first block is Potongan, second is Pendapatan (from the previous error, left was Potongan, right was Pendapatan).
    // The user wants Left: Pemasukan (Pendapatan), Right: Potongan.
    let pendapatanBlock = "";
    let potonganBlock = "";

    if (firstBlock.includes("Rincian Pendapatan")) {
      pendapatanBlock = firstBlock;
      potonganBlock = secondBlock;
    } else {
      potonganBlock = firstBlock;
      pendapatanBlock = secondBlock;
    }

    const beforeContainer = slipStr.substring(0, flex1FirstIdx);
    const afterContainer = slipStr.substring(secondBlockEnd);
    slipStr = beforeContainer + pendapatanBlock + '\n            ' + potonganBlock + afterContainer;
  }
}

fs.writeFileSync('pages/Salary.tsx', beforeSlip + slipStr);
console.log("Done");
