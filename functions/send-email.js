import { Resend } from 'resend';

export async function onRequestPost(context) {
  const { request, env } = context;

  // Initialize Resend with environment variable from Cloudflare
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    const { data, error } = await resend.emails.send({
        from: 'New Inquiry fm Gosafemed Website <onboarding@resend.dev>',
        to: ['hellen@gosafemed.com'],
        subject: `New Inquiry from ${name}`,
        reply_to: email,
        html: `
            <p>You have a new inquiry from the GoSafeMed website:</p>
            <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Company:</strong> ${company}</li>
            </ul>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `
    });

    if (error) {
      console.error({ error });
      return new Response(JSON.stringify(error), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
