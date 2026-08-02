const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSmsNotification } = require('./sms');

test('returns a simulated SMS result when no Twilio credentials are configured', async () => {
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_PHONE_NUMBER;

  const result = await sendSmsNotification({
    id: 42,
    customer: { name: 'Jane Doe', phone: '09171234567' },
  });

  assert.equal(result.ok, true);
  assert.equal(result.simulated, true);
  assert.equal(result.phone, '+639171234567');
});
