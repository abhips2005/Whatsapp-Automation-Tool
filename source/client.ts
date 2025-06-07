import Whatsapp, {
    type Chat,
    type Client as ClientType,
    type Message,
} from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
const { Client, LocalAuth } = Whatsapp;

const client = new Client({
    puppeteer: {
        headless: true,
        args: ["--no-sandbox"],
    },
    // authStrategy: new LocalAuth({
    //     // dataPath: 'authContainer'
    //     // dataPath: 'localAuth'
    // })
});

export const WA = {
    Buttons: Whatsapp.Buttons,
    List: Whatsapp.List,
};

export type ChatOptions = {
    quote?: Message;
    message: Message;
    chat: Chat;
    client: ClientType;
};

client.on("auth_failure", (msg) => {
    console.error("AUTHENTICATION FAILURE", msg);
});

client.on("authenticated", () => {
    console.log("AUTHENTICATED");
    (global as any).whatsappQR = null;
    (global as any).whatsappStatus = 'authenticated';
    (global as any).whatsappAuthenticated = true;
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    // Store QR code for API access
    (global as any).whatsappQR = qr;
    (global as any).whatsappStatus = 'qr_ready';
    console.log('📱 QR Code available at: http://localhost:3001/api/whatsapp/qr');
});

client.on("disconnected", (reason) => {
    console.log("Client was logged out", reason);
    (global as any).whatsappQR = null;
    (global as any).whatsappStatus = 'disconnected';
    (global as any).whatsappAuthenticated = false;
});

export { client };
