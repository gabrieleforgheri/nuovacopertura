import nodemailer from 'nodemailer';

async function run() {
  const host = 'smtp.zoho.eu';

  const transporter = nodemailer.createTransport({
    host: host, // use host instead of IP
    port: 465,
    secure: true,
    auth: { user: 'test@yrb4g.com', pass: 'test' },
  });

  try {
    await transporter.verify();
    console.log("Verified");
  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
