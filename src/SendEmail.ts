import { createTransport } from "nodemailer";

import { readSettings } from "./ReadSettings";

export async function sendEmail(to: string, subject: string, message: string): Promise<void> {
    const settings = await readSettings();
    console.log(`Email sent: to: ${to}, subject: ${subject}, message: ${message}`);

    const transporter = createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        auth: {
            user: settings.smtp.auth.user,
            pass: settings.smtp.auth.pass,
        },
    });
    const mailOptions = {
        from: settings.smtp.sender,
        to: to,
        subject: subject,
        text: message,
    };
    await new Promise<void>((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                console.log(info);
                resolve();
            }
        });
    });
}
