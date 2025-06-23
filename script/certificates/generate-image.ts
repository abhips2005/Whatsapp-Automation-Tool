import Jimp from "jimp-compact";
import QRCode from "qrcode";
import JsonData from "@/script/certificates/out.json";
import { dataZod } from "@/script/validation";
import { createToken } from "@/lib/encryption";

const parentFolder = "./script/certificates";

const template1 = (templateImage: Jimp) => ({
    image: {
        x: 0,
        y: 1024 - 50, // position
        maxX: templateImage.getWidth(),
        maxY: 0, // size
    },
    secondary: {
        x: 0,
        y: 1024 + 172 - 50, // position
        maxX: templateImage.getWidth(),
        maxY: 0, // size
    },
    qr: {
        getX: (qrImage: Jimp) =>
            templateImage.getWidth() - qrImage.getWidth() - 75,
        getY: (qrImage: Jimp) =>
            templateImage.getHeight() - qrImage.getHeight() - 68, // position
    },
});
const template2 = (templateImage: Jimp) => ({
    image: {
        x: templateImage.getWidth() / 2,
        y: 30, // position
        maxY: templateImage.getHeight(),
        maxX: templateImage.getWidth() / 2, // size
    },
    qr: {
        getX: (qrImage: Jimp) => 30, // position
        getY: (qrImage: Jimp) =>
            templateImage.getHeight() - qrImage.getHeight() - 30,
    },
});

const template3 = (templateImage: Jimp) => ({
    image: {
        x: 0,
        y: 0, // position
        maxY: templateImage.getHeight() / 2,
        maxX: templateImage.getWidth(), // size
    },
    qr: {
        getX: (qrImage: Jimp) =>
            templateImage.getWidth() / 2 - qrImage.getWidth() / 2, // position
        getY: (qrImage: Jimp) => templateImage.getHeight() / 3 - 20,
    },
});

const data = dataZod.parse(JsonData); //.slice(4, 5)
const eventId = "fossday-24";

const fileName = `${eventId}.png`; // 'template1.png'
const templateImage = await Jimp.read(`${parentFolder}/resources/${fileName}`);
const template = template1(templateImage); // template1(templateImage)

// const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)

// https://ttf2fnt.com/ (use this tool to convert ttf to fnt)
const font = await Jimp.loadFont(`${parentFolder}/resources/font/pixter.fnt`);

console.log("J");

// biome-ignore lint/complexity/noForEach: <explanation>
data.forEach(async (d) => {
    const token = createToken({
        id: eventId,
        email: d.email,
        type: "certificate",
    });

    const copyTemplateImage = templateImage.clone();
    const qrBuffer = await QRCode.toBuffer(token ?? "");

    copyTemplateImage.print(
        font,
        template.image.x,
        template.image.y,
        {
            text: d.name.toUpperCase(),
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE, //+ 100,
        },
        template.image.maxX,
        template.image.maxY,
    );

    copyTemplateImage.print(
        font,
        template.secondary.x,
        template.secondary.y,
        {
            text: '"' + d.category.toUpperCase() + '"',
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE, //+ 100,
        },
        template.secondary.maxX,
        template.secondary.maxY,
    );

    // const qrImage = await (await Jimp.read(qrBuffer)).scale(4)
    const qrImage = await Jimp.read(qrBuffer);
    copyTemplateImage.blit(
        qrImage,
        template.qr.getX(qrImage),
        template.qr.getY(qrImage),
    );

    const certificate = `${parentFolder}/${eventId}/${d.email}.${copyTemplateImage.getExtension()}`;
    const done = await copyTemplateImage.writeAsync(certificate);
});

console.log(`Certificates generated for ${data.length} participants`);
