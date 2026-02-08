import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || "https://splitbill.my.id"}/verify?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: "Split Bill <noreply@splitbill.my.id>",
      to: [email],
      subject: "Verify your email - Split Bill",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <!-- Header -->
              <div style="padding: 32px 40px 24px; text-align: left;">
                <img src="https://splitbill.my.id/img/logo-splitbill-black.png" alt="Split Bill" style="height: 32px; width: auto; display: block;">
              </div>
              
              <!-- Content -->
              <div style="padding: 0 40px 48px;">
                <h2 style="color: #0f172a; font-size: 28px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">
                  Welcome to Split Bill, ${name}!
                </h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                  We're excited to have you join us. To get started, please verify your email address by clicking the button below. This helps us keep your account secure.
                </p>
                
                <a href="${verifyUrl}" style="display: inline-block; background-color: #479fea; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.2s ease;">
                  Verify Email Address
                </a>
                
                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9;">
                  <p style="color: #64748b; font-size: 14px; margin: 0 0 12px;">
                    Having trouble? Copy and paste this link into your browser:
                  </p>
                  <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                    ${verifyUrl}
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 32px 40px; background-color: #f8fafc; text-align: center;">
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                  © ${new Date().getFullYear()} Split Bill. All rights reserved.
                </p>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}
