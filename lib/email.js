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

export async function sendSubscriptionConfirmationEmail({
  email,
  name,
  plan,
  expiry,
  orderId,
  amount,
}) {
  const loginUrl = `${process.env.FRONTEND_URL || "https://splitbill.my.id"}/login`;
  const formattedExpiry = new Date(expiry).toLocaleDateString("id-ID", {
    dateStyle: "long",
  });
  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

  try {
    const data = await resend.emails.send({
      from: "Split Bill <noreply@splitbill.my.id>",
      to: [email],
      subject: `Subscription Activated! - ${plan}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <!-- Header -->
              <div style="padding: 32px 40px 24px; text-align: left;">
                <img src="https://splitbill.my.id/img/logo-splitbill-black.png" alt="Split Bill" style="height: 32px; width: auto; display: block;">
              </div>
              
              <!-- Content -->
              <div style="padding: 0 40px 48px;">
                <div style="display: inline-block; padding: 8px 16px; background-color: #f0fdf4; color: #166534; border-radius: 99px; font-size: 12px; font-weight: 700; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.05em;">
                  Payment Successful
                </div>
                <h2 style="color: #0f172a; font-size: 28px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">
                  Your ${plan} is now active!
                </h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                  Hello ${name}, we've successfully processed your payment. You now have full access to all ${plan} features until <strong>${formattedExpiry}</strong>.
                </p>
                
                <!-- Order Details Card -->
                <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #64748b; font-size: 14px;">Order ID</span>
                    <span style="color: #0f172a; font-size: 14px; font-weight: 600; font-family: monospace;">${orderId}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #64748b; font-size: 14px;">Plan</span>
                    <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${plan}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #64748b; font-size: 14px;">Amount Paid</span>
                    <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${formattedAmount}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Expiry Date</span>
                    <span style="color: #16a34a; font-size: 14px; font-weight: 700;">${formattedExpiry}</span>
                  </div>
                </div>
                
                <a href="${loginUrl}" style="display: inline-block; background-color: #479fea; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.2s ease;">
                  Start Scanning Now
                </a>
              </div>
              
              <!-- Footer -->
              <div style="padding: 32px 40px; background-color: #f8fafc; text-align: center;">
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                  © ${new Date().getFullYear()} Split Bill. All rights reserved.
                </p>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">
                  Need help? Contact us at support@splitbill.my.id
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Subscription confirmation email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending subscription confirmation email:", error);
    // Don't throw, we don't want to break the webhook if email fails
    return null;
  }
}
