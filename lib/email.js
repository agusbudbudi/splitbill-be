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
      subject: `Subscription Kamu Aktif! Horee! 🚀`,
      html: `
      <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Split Bill - Payment Confirmed</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">

            <div style="max-width: 560px; margin: 48px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #479fea; padding: 24px 36px;">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://splitbill.my.id/img/logo.png" alt="Split Bill" style="height: 36px; width: auto; display: block; border: 0; color: #ffffff; font-weight: bold; font-size: 20px;">
                  </td>
                  <td align="right" valign="middle">
                    <span style="background: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 600; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.02em; white-space: nowrap; display: inline-block; border: 1px solid rgba(255, 255, 255, 0.3);">✓ Payment Confirmed</span>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <div style="padding: 28px 36px 36px;">
                <p style="font-size: 13px; color: #64748b; margin: 0 0 10px;">Halo, ${name} 👋</p>
                <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 10px; letter-spacing: -0.02em; line-height: 1.3;">
                  Paket ${plan} kamu<br>udah aktif.
                </h1>
                <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 28px;">
                  Pembayaran berhasil diproses. Nikmatin semua fitur ${plan} kamu sampai <strong style="color: #0f172a;">${formattedExpiry}</strong>.
                </p>

                <!-- Divider -->
                <div style="height: 1px; background: #f1f5f9; margin: 0 0 24px;"></div>

                <!-- Order Details -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 9px 0; font-size: 13.5px; color: #64748b;">Order ID</td>
                    <td style="padding: 9px 0; font-size: 13px; font-weight: 500; color: #0f172a; text-align: right; font-family: 'Courier New', monospace;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 0; font-size: 13.5px; color: #64748b;">Paket</td>
                    <td style="padding: 9px 0; font-size: 13.5px; font-weight: 500; color: #0f172a; text-align: right;">${plan}</td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 0; font-size: 13.5px; color: #64748b;">Total Bayar</td>
                    <td style="padding: 9px 0; font-size: 13.5px; font-weight: 500; color: #0f172a; text-align: right;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding-top: 14px; border-top: 1px solid #f1f5f9; font-size: 13.5px; color: #64748b;">Berlaku Sampai</td>
                    <td style="padding-top: 14px; border-top: 1px solid #f1f5f9; font-size: 13.5px; font-weight: 700; color: #16a34a; text-align: right;">${formattedExpiry}</td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <a href="${loginUrl}"
                        style="display: block; background-color: #479fea; color: #ffffff; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; letter-spacing: -0.01em;">
                        Mulai Scan Sekarang →
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 20px 36px; border-top: 1px solid #f1f5f9;">
                <tr>
                  <td align="left" style="font-size: 12px; color: #94a3b8;">
                    © ${new Date().getFullYear()} Split Bill. All rights reserved.
                  </td>
                  <td align="right">
                    <a href="mailto:split.bill.apps@gmail.com"
                      style="font-size: 12px; color: #64748b; text-decoration: none;">
                      Butuh bantuan?
                    </a>
                  </td>
                </tr>
              </table>
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

export async function sendCampaignEmail({
  email,
  name,
  subject,
  content,
  ctaText,
  ctaUrl,
}) {
  try {
    const data = await resend.emails.send({
      from: "Split Bill <noreply@splitbill.my.id>",
      to: [email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 560px; margin: 48px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
              
              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #479fea; padding: 24px 36px;">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://splitbill.my.id/img/logo.png" alt="Split Bill" style="height: 36px; width: auto; display: block; border: 0;">
                  </td>
                </tr>
              </table>
              
              <!-- Body -->
              <div style="padding: 36px;">
                <div style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 32px;">
                  ${content.replace(/\{\{name\}\}/g, name)}
                </div>
                
                ${
                  ctaText && ctaUrl
                    ? `
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <a href="${ctaUrl}" style="display: block; background-color: #479fea; color: #ffffff; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; letter-spacing: -0.01em;">
                        ${ctaText}
                      </a>
                    </td>
                  </tr>
                </table>
                `
                    : ""
                }
              </div>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                <tr>
                  <td>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                      © ${new Date().getFullYear()} Split Bill. All rights reserved.
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0; line-height: 1.5;">
                      Kamu menerima email ini karena kamu adalah pengguna Split Bill.<br>
                      Pesan ini dikirimkan melalui sistem kampanye resmi.
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `,
    });

    return data;
  } catch (error) {
    console.error("Error sending campaign email:", error);
    throw error;
  }
}
