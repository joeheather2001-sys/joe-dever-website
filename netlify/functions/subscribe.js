const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const params = new URLSearchParams(event.body);
    const email = params.get('email');
    const formName = params.get('form-name') || 'newsletter';

    if (!email || !email.includes('@')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required' }) };
    }

    const API_KEY = process.env.MAILCHIMP_API_KEY;
    const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!API_KEY || !AUDIENCE_ID) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Mailchimp not configured' }) };
    }

    const datacenter = API_KEY.split('-')[1];
    const emailHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

    const checkRes = await fetch(`https://${datacenter}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members/${emailHash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const existing = await checkRes.json();

    if (existing.status === 'subscribed') {
      return { statusCode: 200, body: JSON.stringify({ message: 'Already subscribed!' }) };
    }

    const addRes = await fetch(`https://${datacenter}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        tags: [formName === 'lead-magnet' ? 'lead-magnet' : 'newsletter']
      })
    });

    const result = await addRes.json();

    if (result.status >= 400) {
      return { statusCode: 400, body: JSON.stringify({ error: result.detail || 'Subscription failed' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success!' }) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
