import nodemailer from 'nodemailer';
import { config } from './config.js';

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}

export async function sendCaseInvite({ email, caseTitle, url }) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.smtpFrom) {
    throw Object.assign(new Error('Email invitations are not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in server/.env.'), { status: 503, code: 'INVITES_NOT_CONFIGURED' });
  }
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  const safeTitle = escapeHtml(caseTitle);
  await transporter.sendMail({
    from: config.smtpFrom,
    to: email,
    subject: `You're invited to investigate: ${caseTitle}`,
    text: `A teammate invited you to investigate the fictional mystery “${caseTitle}”. Join the case: ${url}\n\nThis invitation expires in 48 hours.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;padding:28px;background:#171719;color:#eee;border:1px solid #49413b"><p style="color:#dfaf60;letter-spacing:2px;font-size:12px">CASEFILE STUDIO · TEAM INVITATION</p><h1 style="font-weight:500">A case needs another pair of eyes.</h1><p>You have been invited to investigate <strong>${safeTitle}</strong>, a fictional mystery.</p><p><a href="${url}" style="display:inline-block;padding:13px 18px;background:#d85d4e;color:white;text-decoration:none">JOIN THE INVESTIGATION</a></p><p style="color:#aaa;font-size:12px">This one-time invitation expires in 48 hours. Everything in the case is fictional.</p></div>`
  });
}
