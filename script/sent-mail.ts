// TESTING: Import test data for testing
import JsonData from "./certificates/test-out.json";

// REAL DATA: Uncomment this line and comment out the line above for real data
// import JsonData from "./certificates/out.json";

import { simplifiedDataZod, type CertificateZod } from "./validation";
import { sentMail, simpleHTMLMail } from "@/source/mailer";
import { getMessages } from "./message";
// import fs from "fs";
// import { promisify } from "util";

// const readFileAsync = promisify(fs.readFile);

const json = simplifiedDataZod.parse(JsonData);
const id = "fossday-24";
const imageFolder = `./script/certificates/${id}`;

console.log("🧪 TESTING MODE - Using test data");
console.log("Total JSON", json.length);

// Count by role
const roleCount = json.reduce((acc, entry) => {
    const role = entry.assignedRole || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
}, {} as Record<string, number>);

console.log("Breakdown by role:", roleCount);

// biome-ignore lint/complexity/noForEach: <explanation>
json.forEach(async (data, i) => {
    const { name, email, assignedRole } = data;

    // Get the appropriate message based on role
    const messageText = getMessages(data);
    
    // Skip if no message (e.g., for rejected users)
    if (!messageText) {
        console.log(`${i}. Skipped ${email} (${assignedRole}) - No message template`);
        return;
    }

    const subject = assignedRole?.toLowerCase() === 'mentor' 
        ? "🌟 Congratulations! Selected as Mentor - Asthra 9.0"
        : "🎉 Congratulations! Selected as Intern - Asthra 9.0";

    sentMail({
        to: email,
        subject,
        html: simpleHTMLMail({
            title: subject,
            body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${messageText.replaceAll("\n", "<br/>")}</div>`,
        }),

        // attachments: [{
        //     filename: `${email}.png`,
        //     content: imageAttachment,
        //     encoding: 'base64',
        //     cid: 'uniqueImageCID', // Referenced in the HTML template
        // }],
    })
        .then((e) => {
            console.log(`${i}. ✅ Sent to ${email} (${assignedRole})`);
        })
        .catch((e) => {
            console.log(`${i}. ❌ Error sending to ${email} (${assignedRole}):`, e);
        });
});
