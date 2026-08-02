const https = require('https');

function normalizePhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.startsWith('63')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

async function sendSmsNotification(order) {
  const phone = normalizePhoneNumber(order?.customer?.phone || order?.phone || '');
  const message = `Your order #${order?.id || 'unknown'} has been placed successfully. Thank you for shopping with Elijah Consumer Goods Trading.`;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return {
      ok: true,
      simulated: true,
      phone,
      message,
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_PHONE_NUMBER,
    Body: message,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        auth: `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(form.toString()),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, simulated: false, phone, message, body });
          } else {
            reject(new Error(`SMS failed with status ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(form.toString());
    req.end();
  });
}

module.exports = {
  normalizePhoneNumber,
  sendSmsNotification,
};
