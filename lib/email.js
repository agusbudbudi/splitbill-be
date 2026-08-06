import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || "https://www.splitbill.my.id"}/verify?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: "Split Bill <noreply@splitbill.my.id>",
      to: [email],
      subject: "Verifikasi Akun Split Bill Kamu",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifikasi Akun - Split Bill</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 560px; margin: 48px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
              
              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #479fea; padding: 24px 36px;">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://www.splitbill.my.id/img/logo.png" alt="Split Bill" style="height: 36px; width: auto; display: block; border: 0;">
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <div style="padding: 36px;">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 10px;">Halo, ${name} 👋</p>
                <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px; letter-spacing: -0.02em; line-height: 1.3;">
                  Selamat Datang di<br>Split Bill!
                </h1>
                <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 32px;">
                  Senang sekali kamu bergabung! Tinggal satu langkah lagi untuk mulai mengelola struk dan patungan dengan mudah. Yuk, verifikasi email kamu sekarang.
                </p>
                
                <!-- CTA Button -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <a href="${verifyUrl}" style="display: block; background-color: #479fea; color: #ffffff; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; letter-spacing: -0.01em;">
                        Verifikasi Email Saya →
                      </a>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">
                    Ada masalah dengan tombol di atas? Copy dan paste link di bawah ini ke browser kamu:
                  </p>
                  <p style="color: #479fea; font-size: 12px; word-break: break-all; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                    ${verifyUrl}
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                <tr>
                  <td>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                      © ${new Date().getFullYear()} Split Bill. All rights reserved.
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0; line-height: 1.5;">
                      Jika kamu merasa tidak pernah mendaftar akun di Split Bill,<br>silakan abaikan email ini dengan aman.
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Verification email sent successfully:", data);
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
  const loginUrl = `${process.env.FRONTEND_URL || "https://www.splitbill.my.id"}/login`;
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
                    <img src="https://www.splitbill.my.id/img/logo.png" alt="Split Bill" style="height: 36px; width: auto; display: block; border: 0; color: #ffffff; font-weight: bold; font-size: 20px;">
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

export async function sendSplitBillSummaryEmail({
  email,
  name,
  activityName,
  occurredAt,
  totalBill,
  participantCount,
  splitBillId,
  detailUrl,
  reviewUrl,
}) {
  const formattedDate = new Date(occurredAt).toLocaleDateString("id-ID", {
    dateStyle: "long",
  });
  const formattedTotal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(totalBill);

  try {
    const data = await resend.emails.send({
      from: "Split Bill <noreply@splitbill.my.id>",
      to: [email],
      subject: `${name}, struk split bill "${activityName}" kamu sudah tersimpan! 🧾`,
      html: `
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Struk Split Bill Kamu</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" type="text/css">
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; padding: 0; background-color: #EAF2FB; }
              a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
              #MessageViewBody a { color: inherit; text-decoration: none; }
              p { line-height: inherit; }

              @media (max-width: 560px) {
                .receipt { width: 96% !important; }
                .pad { padding-left: 16px !important; padding-right: 16px !important; }
                .wrap { padding-left: 6px !important; padding-right: 6px !important; }
                .headline { font-size: 22px !important; }
                .reward-num { font-size: 44px !important; }
              }
            </style>
          </head>

          <body style="margin:0; padding:0; background-color:#EAF2FB;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF2FB;">
          <tr>
          <td align="center" class="wrap" style="padding: 44px 12px 56px 12px;">

            <!-- RECEIPT CARD -->
            <table role="presentation" class="receipt" width="480" cellpadding="0" cellspacing="0" style="width:480px; max-width:480px; background-color:#EAF2FB;">

              <!-- torn top edge (blue paper showing through the cut) -->
              <tr>
                <td style="height:14px; line-height:0; font-size:0; background-color:#EAF2FB;
                  background-image: linear-gradient(135deg, transparent 7px, #479FEA 7px), linear-gradient(-135deg, transparent 7px, #479FEA 7px);
                  background-size: 14px 14px; background-position: left top; background-repeat: repeat-x;">&nbsp;</td>
              </tr>

              <!-- logo band (blue paper header, inside the receipt) -->
              <tr>
                <td align="center" style="background-color:#479FEA; padding: 22px 44px 26px;">
                  <img src="https://www.splitbill.my.id/img/logo.png" alt="Split Bill" height="30" style="display:inline-block; height:30px; width:auto; border:0;">
                </td>
              </tr>

              <!-- receipt body -->
              <tr>
                <td class="pad" style="background-color:#FFFFFF; padding: 4px 44px 8px 44px;">

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-top: 18px; font-family: 'Inter', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #8A98AC; text-transform: uppercase;">
                        Split Bill Receipt
                      </td>
                    </tr>
                    <tr>
                      <td align="center" class="headline" style="padding-top: 8px; padding-bottom: 20px; font-family: 'Inter', Arial, sans-serif; font-size: 27px; font-weight: 800; letter-spacing: -0.5px; color: #0B1F3A;">
                        Tersimpan &amp; siap dibagikan
                      </td>
                    </tr>

                    <!-- dashed divider -->
                    <tr><td style="border-top: 1.5px dashed #D7E3F2; font-size:0; line-height:0;">&nbsp;</td></tr>

                    <!-- line items -->
                    <tr>
                      <td style="padding: 22px 0 0 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-family:'Inter', Arial, sans-serif; font-size:12px; font-weight:600; letter-spacing:0.5px; color:#8A98AC; text-transform:uppercase; padding-bottom:14px;">Aktivitas</td>
                            <td align="right" style="font-family:'Inter', Arial, sans-serif; font-size:14px; font-weight:700; color:#0B1F3A; padding-bottom:14px;">${activityName}</td>
                          </tr>
                          <tr>
                            <td style="font-family:'Inter', Arial, sans-serif; font-size:12px; font-weight:600; letter-spacing:0.5px; color:#8A98AC; text-transform:uppercase; padding-bottom:14px;">Tanggal</td>
                            <td align="right" style="font-family:'Inter', Arial, sans-serif; font-size:14px; font-weight:700; color:#0B1F3A; padding-bottom:14px;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td style="font-family:'Inter', Arial, sans-serif; font-size:12px; font-weight:600; letter-spacing:0.5px; color:#8A98AC; text-transform:uppercase;">Peserta</td>
                            <td align="right" style="font-family:'Inter', Arial, sans-serif; font-size:14px; font-weight:700; color:#0B1F3A;">${participantCount} orang</td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <tr><td style="padding-top:22px; border-top: 1.5px dashed #D7E3F2; font-size:0; line-height:0;">&nbsp;</td></tr>

                    <!-- total band -->
                    <tr>
                      <td style="padding-top: 18px; padding-bottom: 20px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#479FEA; border-radius: 8px;">
                          <tr>
                            <td style="padding: 18px 22px;">
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="font-family:'Inter', Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:1.5px; color:#E4F1FF; text-transform:uppercase;">Total Bill</td>
                                </tr>
                                <tr>
                                  <td style="font-family:'Inter', Arial, sans-serif; font-size:32px; font-weight:800; letter-spacing:-0.5px; color:#FFFFFF; padding-top:4px;">${formattedTotal}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                      <td align="center" style="padding-bottom: 26px;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="background-color:#0B1F3A; border-radius: 40px;">
                              <a href="${detailUrl}" target="_blank" style="display:inline-block; padding:15px 34px; font-family:'Inter', Arial, sans-serif; font-size:14px; font-weight:700; letter-spacing:0.2px; color:#FFFFFF; text-decoration:none; border-radius:40px;">
                                Lihat Detail Struk →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- perforation cut line -->
              <tr>
                <td style="background-color:#FFFFFF;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="18" style="background-color:#EAF2FB; border-radius: 0 9px 9px 0; height:18px;">&nbsp;</td>
                      <td style="border-top: 2px dashed #CBDCEF; font-family:'Inter', Arial, sans-serif; font-size:10px; font-weight:700; letter-spacing:1.5px; color:#8A98AC; text-align:center; text-transform:uppercase;">
                        ✂ sobek di sini
                      </td>
                      <td width="18" style="background-color:#EAF2FB; border-radius: 9px 0 0 9px; height:18px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- coupon stub -->
              <tr>
                <td class="pad" style="background-color:#FFFFFF; padding: 24px 44px 30px 44px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF4FF; border-radius: 8px; border: 1.5px solid #D7E9FC;">
                    <tr>
                      <td style="padding: 28px 30px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-family:'Inter', Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:1.5px; color:#5C86B8; text-transform:uppercase;">
                              Kupon Reward · Review Pertama
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:10px;">
                              <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td class="reward-num" style="font-family:'Inter', Arial, sans-serif; font-size:52px; font-weight:800; letter-spacing:-1px; color:#479FEA; padding-right:10px;">5×</td>
                                  <td style="font-family:'Inter', Arial, sans-serif; font-size:14px; font-weight:700; color:#0B1F3A; line-height:1.4;">AI SCAN<br>GRATIS</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:16px; font-family:'Inter', Arial, sans-serif; font-size:15px; font-weight:400; color:#3E556F; line-height:1.6;">
                              Kasih review singkat soal pengalamanmu pakai Split Bill, langsung dapat 5x AI Scan gratis buat split bill berikutnya.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:22px;">
                              <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" style="background-color:#479FEA; border-radius: 40px;">
                                    <a href="${reviewUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:'Inter', Arial, sans-serif; font-size:14px; font-weight:700; letter-spacing:0.2px; color:#FFFFFF; text-decoration:none; border-radius:40px;">
                                      Kirim Review
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:22px;">
                              <div style="height:22px; background-image: repeating-linear-gradient(90deg, #0B1F3A 0px, #0B1F3A 2px, transparent 2px, transparent 5px); opacity: 0.35; background-size: 100% 100%;"></div>
                              <div style="font-family:'Inter', Arial, sans-serif; font-size:9px; letter-spacing:1.5px; color:#8A98AC; padding-top:6px;">REVIEW-${splitBillId}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- torn bottom edge -->
              <tr>
                <td style="height:14px; line-height:0; font-size:0; background-color:#EAF2FB;
                  background-image: linear-gradient(45deg, transparent 7px, #FFFFFF 7px), linear-gradient(-45deg, transparent 7px, #FFFFFF 7px);
                  background-size: 14px 14px; background-position: left bottom; background-repeat: repeat-x;">&nbsp;</td>
              </tr>

            </table>

            <!-- FOOTER -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
              <tr>
                <td align="center" style="padding-top: 30px; font-family:'Inter', Arial, sans-serif; font-size:11px; color:#8A98AC; text-align:center; line-height:1.8;">
                  Email ini dikirim otomatis karena kamu menyimpan split bill di Split Bill.<br>
                  © ${new Date().getFullYear()} Split Bill Online — Smart Way to Split Expenses.<br>
                  <a href="mailto:split.bill.apps@gmail.com" style="color:#479FEA; text-decoration:underline;">Butuh bantuan?</a>
                </td>
              </tr>
            </table>

          </td>
          </tr>
          </table>
          </body>
        </html>
      `,
    });

    console.log("Split bill summary email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending split bill summary email:", error);
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
                    <img src="https://www.splitbill.my.id/img/logo.png" alt="Split Bill" style="height: 36px; width: auto; display: block; border: 0;">
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <div>
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
