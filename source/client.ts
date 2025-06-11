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
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu"
        ],
    },
    authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth'
    })
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

// Add connection state tracking
let isReady = false;
let isConnecting = false;

client.on("auth_failure", (msg) => {
    console.error("AUTHENTICATION FAILURE", msg);
    (global as any).whatsappStatus = 'auth_failure';
    isReady = false;
});

client.on("authenticated", () => {
    console.log("AUTHENTICATED");
    (global as any).whatsappQR = null;
    (global as any).whatsappStatus = 'authenticated';
    (global as any).whatsappAuthenticated = true;
});

client.on("ready", () => {
    console.log("CLIENT IS READY");
    isReady = true;
    isConnecting = false;
    (global as any).whatsappStatus = 'ready';
    (global as any).whatsappAuthenticated = true;
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    // Store QR code for API access
    (global as any).whatsappQR = qr;
    (global as any).whatsappStatus = 'qr_ready';
    isReady = false;
    console.log('📱 QR Code available at: http://localhost:5000/api/whatsapp/qr');
});

client.on("disconnected", (reason) => {
    console.log("Client was logged out, reason:", reason);
    (global as any).whatsappQR = null;
    (global as any).whatsappStatus = 'disconnected';
    (global as any).whatsappAuthenticated = false;
    isReady = false;
    isConnecting = false; // Reset connecting state
    
    // Only auto-reconnect if it wasn't a manual logout
    if (reason !== 'LOGOUT') {
        console.log("Auto-reconnecting due to unexpected disconnection...");
        setTimeout(() => {
            if (!isConnecting) {
                console.log("Attempting to reconnect...");
                isConnecting = true;
                client.initialize();
            }
        }, 5000);
    } else {
        console.log("Manual logout detected - will wait for manual reinitialize");
        // Don't auto-reinitialize on manual logout - let the API handle it
    }
});

// Export helper functions
export const isClientReady = () => isReady;
export const waitForClient = async (timeout = 30000) => {
    return new Promise((resolve, reject) => {
        if (isReady) {
            resolve(true);
            return;
        }
        
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (isReady) {
                clearInterval(checkInterval);
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('WhatsApp client not ready within timeout'));
            }
        }, 1000);
    });
};

export { client };
