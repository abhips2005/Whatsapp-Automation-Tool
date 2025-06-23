import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import triedAsync from "../lib/utils";

const transporter = nodemailer.createTransport({
    pool: true,
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
        user: process.env.NM_EMAIL,
        pass: process.env.NM_PASS,
    },
});

type MailOptions = SendMailOptions;

export const sentMail = async (props: MailOptions) => {
    return await triedAsync(transporter.sendMail(props));
};

export const simpleHTMLMail = ({
    title,
    body,
}: {
    title: string;
    body: string;
}) => {
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body>${body}</body>
</html>`;
};
