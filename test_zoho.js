import nodemailer from 'nodemailer';

async function run() {
  const host = 'smtp.zoho.eu';
  const { lookup } = await import('node:dns/promises');
  const { address } = await lookup(host, { family: 4 });

  console.log("IP:", address);

  const transporter = nodemailer.createTransport({
    host: address, // use IP instead of host
    port: 465,
    secure: true,
    auth: { user: 'test@yrb4g.com', pass: 'test' },
    tls: { servername: host }
  });

  try {
    await transporter.verify();
    console.log("Verified");
  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
