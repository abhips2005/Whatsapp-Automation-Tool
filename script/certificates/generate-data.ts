import { json2csv, csv2json } from 'json-2-csv';
// import { createToken } from "@/lib/encryption";
import { csvToJsonZod, dataZod, simplifiedDataZod } from '@/script/validation';
// import Certificates from "@/data/certificate.json";

// const id = "insendium-24"
// const certificate = Certificates[id]
const parentFolder = "./script/certificates"

// REAL DATA: Using real data for production
const inputCSV = `${parentFolder}/data.csv`;

const csv = await Bun.file(inputCSV).text()

const json = csv2json(csv, {
    trimHeaderFields: true,
    trimFieldValues: true,
})

console.log("🚀 PRODUCTION MODE - Using real data")
console.log("Raw JSON data (first 3 entries):", json.slice(0, 3))

// First validate with the CSV structure
const validatedRawJson = dataZod.parse(json)

console.log(`Filtered valid entries: ${validatedRawJson.length} out of ${json.length}`)

// Transform to the simplified format needed for certificates
const transformedData = validatedRawJson.map(entry => ({
    name: entry["Name"],
    email: entry["Email"],
    // Use Role column as the primary role, fallback to "participant"
    type: entry["Role"] || "participant",
    phone: entry["Phone number"], // Include phone number
    assignedRole: entry["Role"], // Use Role column for message routing
    year: entry["Year of study"],
    branch: entry["Branch"],
    github: entry["Github/ Portfolio"],
    mentor: entry["Would you like to be a mentor? (i.e. lead projects)"],
    project: entry["Assigned Project"],
}))

// Include ALL users - don't filter out anyone since we want to message everyone
const filteredData = transformedData; // Everyone gets messages now

console.log(`Total entries to process: ${filteredData.length} (including all roles)`);

// Validate the transformed data
const validatedJson = simplifiedDataZod.parse(filteredData)

const outputJsonData = validatedJson.map(e => ({
    ...e,
    // token: createToken({ 
    //     // id, 
    //     email: e.email, type: "certificate" }),
}))

// REAL DATA: Using production output files
const outputCsv = `${parentFolder}/out.csv`;
const outputJson = `${parentFolder}/out.json`;

// Generate CSV output
const outputData = json2csv(outputJsonData)

await Bun.write(
    outputCsv,
    outputData
)

await Bun.write(
    outputJson,
    JSON.stringify(outputJsonData, null, 3)
)

console.log(`🚀 PRODUCTION Data generated successfully!`)
console.log(`- Total entries processed: ${validatedJson.length}`)
console.log(`- Breakdown by role:`)
const roleCount = outputJsonData.reduce((acc, entry) => {
    const role = entry.assignedRole || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
}, {} as Record<string, number>);
console.log(roleCount);

console.log(`- Breakdown by year:`)
const yearCount = outputJsonData.reduce((acc, entry) => {
    const year = entry.year || 'unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
}, {} as Record<string, number>);
console.log(yearCount);

console.log(`- Breakdown by branch:`)
const branchCount = outputJsonData.reduce((acc, entry) => {
    const branch = entry.branch || 'unknown';
    acc[branch] = (acc[branch] || 0) + 1;
    return acc;
}, {} as Record<string, number>);
console.log(branchCount);

console.log(`- Output files created:`)
console.log(`  * ${outputCsv}`)
console.log(`  * ${outputJson}`)
console.log("\nFirst few entries:")
console.log(outputJsonData.slice(0, 3))