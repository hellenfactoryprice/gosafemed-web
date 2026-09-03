import { Resend } from 'resend';

const ALLOWED_ORIGINS = [
  'https://www.gosafemed.com',
  'https://gosafemed.com',
  'http://localhost',
];

const MIN_SUBMIT_SECONDS = 3;
const MAX_SUBMIT_SECONDS = 2 * 60 * 60;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPAM_KEYWORDS = [
  'seo', 'search engine optimization', 'backlink', 'rank higher',
  'google ranking', 'do follow', 'dofollow', 'guest post',
  'outreach', 'free trial', 'bit.ly', 'crypto', 'bitcoin',
  'nude', 'casino', 'gambling',
];

function isValidOrigin(referrer, origin) {
  const candidates = [];
  if (referrer) candidates.push(referrer);
  if (origin) candidates.push(origin);

  if (candidates.length === 0) return false;

  return candidates.some((c) =>
    ALLOWED_ORIGINS.some((o) => c.toLowerCase().startsWith(o.toLowerCase()))
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    if (!isValidOrigin(referer, origin)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized origin.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      name, email, company, message,
      bot_trap, _ts,
    } = body || {};

    if (bot_trap && String(bot_trap).trim() !== '') {
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof _ts !== 'number' || _ts <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing submission timestamp. Please refresh and try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = Date.now();
    const elapsedSec = (now - _ts) / 1000;
    if (elapsedSec < MIN_SUBMIT_SECONDS) {
      return new Response(
        JSON.stringify({ error: 'Submission too fast. Please fill out the form before submitting.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (elapsedSec > MAX_SUBMIT_SECONDS) {
      return new Response(
        JSON.stringify({ error: 'Form session expired. Please refresh the page and try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requiredFields = [
      { key: 'name', value: name, minLen: 2, maxLen: 120 },
      { key: 'email', value: email, minLen: 5, maxLen: 254 },
      { key: 'message', value: message, minLen: 5, maxLen: 5000 },
    ];

    for (const f of requiredFields) {
      if (typeof f.value !== 'string') {
        return new Response(
          JSON.stringify({ error: `Invalid ${f.key}.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const val = f.value.trim();
      if (val === '' || val.toLowerCase() === 'undefined' || val.toLowerCase() === 'null') {
        return new Response(
          JSON.stringify({ error: `${f.key} cannot be empty.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (val.length < f.minLen || val.length > f.maxLen) {
        return new Response(
          JSON.stringify({ error: `${f.key} length out of range.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const nameTrim = name.trim();
    const emailTrim = email.trim();
    const companyTrim = typeof company === 'string' ? company.trim() : '';
    const messageTrim = message.trim();

    if (!EMAIL_REGEX.test(emailTrim)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const spamHaystack = `${nameTrim}\n${emailTrim}\n${companyTrim}\n${messageTrim}`.toLowerCase();
    const hasSpamKeyword = SPAM_KEYWORDS.some((k) => spamHaystack.includes(k));
    const hasUrl = /https?:\/\//i.test(messageTrim);
    if (hasSpamKeyword || hasUrl) {
      return new Response(
        JSON.stringify({ error: 'Submission rejected due to suspicious content.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(context.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'New Inquiry fm Gosafemed Website <onboarding@resend.dev>',
      to: ['hellen@gosafemed.com'],
      subject: `New Inquiry from ${escapeHtml(nameTrim)}`,
      reply_to: emailTrim,
      html: `
        <p>You have a new inquiry from the GoSafeMed website:</p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(nameTrim)}</li>
          <li><strong>Email:</strong> ${escapeHtml(emailTrim)}</li>
          <li><strong>Company:</strong> ${escapeHtml(companyTrim)}</li>
        </ul>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(messageTrim).replace(/\n/g, '<br>')}</p>
      `,
    });

    if (error) {
      console.error({ error });
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to send email.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data || { ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
