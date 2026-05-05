import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, email, company, message } = req.body;

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
      return res.status(400).json(error);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
