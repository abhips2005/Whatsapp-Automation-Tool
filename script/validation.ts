import { sjcetMailSchema } from "@/lib/email";
import { z } from "zod";

export const dataZod = z.array(z.object({
    "Name": z.string().optional(),
    "Email": z.string().optional(),
    "Phone number": z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
    "Year of study": z.union([z.string(), z.number()]).optional(),
    "Branch": z.string().optional(),
    "Role": z.string().optional(),
    "Github/ Portfolio": z.string().optional(),
    "Would you like to be a mentor? (i.e. lead projects)": z.string().optional(),
    "Assigned Project": z.string().optional(),
})).transform(data => 
    data.filter(row => {
        const name = row["Name"];
        const email = row["Email"];
        
        // Filter out rows with missing essential data or team headers
        return name && 
               name.trim().length > 0 && 
               // Filter out team headers and placeholder entries
               !name.toLowerCase().startsWith("team ") &&
               email && 
               email.trim().length > 0 && 
               email.includes('@') &&
               // Basic email validation
               email.trim() !== "";
    })
)

// Create a simpler schema for the certificate generation that maps the fields we need
export const simplifiedDataZod = z.array(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").refine(
        (email) => email.includes('@') && email.includes('.'),
        "Must be a valid email format"
    ),
    type: z.string().min(1, "Type/Role is required"),
    phone: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
    assignedRole: z.string().optional(),
    year: z.union([z.string(), z.number()]).transform(val => val ? String(val) : undefined).optional(),
    branch: z.string().optional(),
    github: z.string().optional(),
    mentor: z.union([z.string(), z.object({}).passthrough()]).transform(val => {
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && val !== null) {
            // Convert object to string representation or extract meaningful data
            return JSON.stringify(val);
        }
        return '';
    }).optional(),
    project: z.string().optional(),
})).refine(
    (data) => data.length > 0,
    "At least one valid contact is required"
)

export type CertificateZod = z.infer<typeof simplifiedDataZod>

export const csvToJsonZod = z.array(z.object({
    event_register_id: z.string(),
    name: z.string(),
}))