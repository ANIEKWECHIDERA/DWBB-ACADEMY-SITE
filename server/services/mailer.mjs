import nodemailer from "nodemailer";

export function createMailer({ appBaseUrl, downloadLinkTtlDays }) {
  let cachedTransportPromise;

  async function sendConfirmationEmail({
    courseTitle,
    customerName,
    email,
    downloadUrl,
  }) {
    if (!email) {
      return { previewUrl: null };
    }

    const safeCustomerName = escapeHtml(customerName || "Customer");
    const safeCourseTitle = escapeHtml(courseTitle || "Your course");
    const safeDownloadUrl = escapeHtml(downloadUrl);
    const safeAppBaseUrl = String(appBaseUrl || "http://localhost:5173").replace(
      /\/+$/,
      "",
    );
    const logoUrl = `${safeAppBaseUrl}/dwbb-logo.png`;
    const supportUrl =
      "https://wa.me/2348106258080?text=Hello%20DWBB%20Academy!%20I%20need%20help%20with%20my%20course%20download.";

    const html = `
      <div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0a1e4a 0%,#1a3a7a 100%);padding:28px 32px;text-align:center;">
            <img src="${logoUrl}" alt="DWBB Academy logo" style="height:72px;width:auto;display:block;margin:0 auto 16px;" />
            <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#f5c842;font-weight:700;">Payment Confirmed</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Your course materials are ready</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#1e293b;">Hello ${safeCustomerName},</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#475569;">
              Thank you for purchasing <strong style="color:#0a1e4a;">${safeCourseTitle}</strong>. Your payment was confirmed successfully, and your downloadable materials are now available.
            </p>
            <div style="margin:24px 0;padding:20px;border:1px solid #dbeafe;background:#f8fbff;border-radius:18px;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Access Window</p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:#1e293b;">
                Your secure download link will remain active for <strong>${downloadLinkTtlDays} days</strong>.
              </p>
            </div>
            <div style="margin:28px 0;text-align:center;">
              <a href="${safeDownloadUrl}" style="display:inline-block;background:#f5c842;color:#0a1e4a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px;">
                Download Course Materials
              </a>
            </div>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
              If the button does not open in your email client, contact support and we will help you regain access quickly.
            </p>
            <div style="padding-top:20px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#475569;">
                Need help accessing your materials?
              </p>
              <a href="${supportUrl}" style="color:#1a3a7a;text-decoration:none;font-weight:700;">Contact DWBB Academy Support</a>
            </div>
          </div>
        </div>
      </div>
    `.trim();

    const transporter = await createMailTransport();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "DWBB Academy <no-reply@dwbbacademy.com>",
      to: email,
      subject: `Your ${courseTitle} download is ready`,
      html,
      text: [
        `Hello ${customerName},`,
        "",
        `Thank you for purchasing ${courseTitle}.`,
        "Your payment was confirmed successfully.",
        "",
        "Download your course materials using the secure button in the HTML email.",
        `Direct fallback link: ${downloadUrl}`,
        `This download link expires in ${downloadLinkTtlDays} days.`,
        "",
        "If you need help, reply to this email or contact DWBB Academy.",
      ].join("\n"),
    });

    return {
      previewUrl: nodemailer.getTestMessageUrl(info) || null,
    };
  }

  async function sendPurchaseAlertEmail({
    chargedAmount,
    courseTitle,
    customerEmail,
    customerName,
    netAmount,
    paidAt,
    phone,
    reference,
  }) {
    const transporter = await createMailTransport();
    const safeAppBaseUrl = String(appBaseUrl || "http://localhost:5173").replace(
      /\/+$/,
      "",
    );
    const logoUrl = `${safeAppBaseUrl}/dwbb-logo.png`;
    const safeCourseTitle = escapeHtml(courseTitle || "Course purchase");
    const safeCustomerName = escapeHtml(customerName || "Customer");
    const safeCustomerEmail = escapeHtml(customerEmail || "-");
    const safePhone = escapeHtml(phone || "-");
    const safeReference = escapeHtml(reference || "-");
    const safeChargedAmount = escapeHtml(chargedAmount || "-");
    const safeNetAmount = escapeHtml(netAmount || "-");
    const safePaidAt = escapeHtml(paidAt || "-");

    const html = `
      <div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0a1e4a 0%,#1a3a7a 100%);padding:28px 32px;text-align:center;">
            <img src="${logoUrl}" alt="DWBB Academy logo" style="height:72px;width:auto;display:block;margin:0 auto 16px;" />
            <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#f5c842;font-weight:700;">New Purchase Alert</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">A course purchase was confirmed</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#475569;">
              A verified Paystack payment has been fulfilled successfully.
            </p>
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                ${renderRow("Course", safeCourseTitle)}
                ${renderRow("Customer", safeCustomerName)}
                ${renderRow("Email", safeCustomerEmail)}
                ${renderRow("Phone", safePhone)}
                ${renderRow("Gross Charged", safeChargedAmount)}
                ${renderRow("Net Target", safeNetAmount)}
                ${renderRow("Reference", safeReference)}
                ${renderRow("Paid At", safePaidAt)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `.trim();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "DWBB Academy <no-reply@dwbbacademy.com>",
      to: "dwbbacademy@gmail.com",
      subject: `New purchase: ${courseTitle}`,
      html,
      text: [
        "A verified course purchase was completed.",
        "",
        `Course: ${courseTitle}`,
        `Customer: ${customerName}`,
        `Email: ${customerEmail || "-"}`,
        `Phone: ${phone || "-"}`,
        `Gross Charged: ${chargedAmount || "-"}`,
        `Net Target: ${netAmount || "-"}`,
        `Reference: ${reference || "-"}`,
        `Paid At: ${paidAt || "-"}`,
      ].join("\n"),
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function createMailTransport() {
    if (!cachedTransportPromise) {
      cachedTransportPromise = (async () => {
        if (
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASS
        ) {
          return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: String(process.env.SMTP_SECURE || "false") === "true",
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
        }

        const account = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: {
            user: account.user,
            pass: account.pass,
          },
        });
      })();
    }

    return cachedTransportPromise;
  }

  return {
    sendConfirmationEmail,
    sendPurchaseAlertEmail,
  };
}

function renderRow(label, value) {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#0f172a;width:180px;vertical-align:top;">${label}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#475569;">${value}</td>
    </tr>
  `.trim();
}
