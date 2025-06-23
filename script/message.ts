import { createToken } from "../lib/encryption";
import { type CertificateZod } from "./validation";

// INTERN MESSAGE TEMPLATE
export const getInternMessage = (data: CertificateZod[0]) => {
    const { name, email, type } = data;

    const token = createToken({
        id: "asthra-9",
        email: email,
        type: "certificate",
        options: {
            type: "intern",
            position: type,
        },
    });

    const image = `https://res.cloudinary.com/de3q8zas9/image/upload/co_rgb:000000,l_text:roboto_140_bold_normal_left:${encodeURIComponent(name)}/fl_layer_apply,y_300/co_rgb:000000,l_text:arial_80_bold_normal_left:${encodeURIComponent(type)}/fl_layer_apply,y_580/intern_certificate.png`;
    const url = `https://asthra.sjcetpalai.ac.in/api/qr/with-image?scale=3&url=${encodeURIComponent(image)}&qr=${encodeURIComponent(token)}`;

    return `🎉 Congratulations ${name}!

You have been selected as an intern in the *SJCET Summer Internship Program*.

You will be working as an intern at our partner company *Manolo* for a period of *one month* during *June*.

🔗 Join the official WhatsApp group here: https://chat.whatsapp.com/KAosxl6riRD0GCZwU5mtcH

We look forward to seeing your contributions. All the best! 🚀

Best regards,
SJCET Internship Team` as const;
};

// MENTOR MESSAGE TEMPLATE  
export const getMentorMessage = (data: CertificateZod[0]) => {
    const { name, email, type } = data;

    const token = createToken({
        id: "asthra-9",
        email: email,
        type: "certificate",
        options: {
            type: "mentor",
            position: type,
        },
    });

    const image = `https://res.cloudinary.com/de3q8zas9/image/upload/co_rgb:000000,l_text:roboto_140_bold_normal_left:${encodeURIComponent(name)}/fl_layer_apply,y_300/co_rgb:000000,l_text:arial_80_bold_normal_left:${encodeURIComponent(type)}/fl_layer_apply,y_580/mentor_certificate.png`;
    const url = `https://asthra.sjcetpalai.ac.in/api/qr/with-image?scale=3&url=${encodeURIComponent(image)}&qr=${encodeURIComponent(token)}`;

    return `🌟 Congratulations ${name}!



Best regards,
SJCET Internship Team` as const;
};

// MAIN MESSAGE ROUTER - Routes to appropriate template based on assigned role
export const getMessages = (data: CertificateZod[0] & { assignedRole?: string }) => {
    const role = data.assignedRole?.toLowerCase();
    
    // Check for mentor-type roles
    if (role?.includes('mentor') || role?.includes('team lead')) {
        return getMentorMessage(data);
    }
    
    switch (role) {
        case 'mentor':
            return getMentorMessage(data);
        case 'rejected':
            // Don't send messages to rejected users
            return null;
        case 'developer':
        case 'ui/ux designer':
        case 'intern':
        default:
            // Default to intern message for developers, designers, and others
            return getInternMessage(data);
    }
};

// LEGACY FUNCTION - Keep for backward compatibility
export const getMessages2 = (data: CertificateZod[0]) => {
    const { name, email, type } = data;

    const token = createToken({
        id: "asthra-9",
        email: email,
        type: "certificate",
        options: {
            type: "participant",
            position: type,
        },
    });

    const image = `https://res.cloudinary.com/de3q8zas9/image/upload/co_rgb:000000,l_text:roboto_140_bold_normal_left:${encodeURIComponent(name)}/fl_layer_apply,y_280/co_rgb:000000,l_text:arial_80_bold_normal_left:${encodeURIComponent(type)}/fl_layer_apply,y_540/participation.png`;
    const url = `https://asthra.sjcetpalai.ac.in/api/qr/with-image?scale=3&url=${encodeURIComponent(image)}&qr=${encodeURIComponent(token)}`;

    return `i` as const;
};
