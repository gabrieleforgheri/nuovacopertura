import nodemailer from 'nodemailer';

async function run() {
  let testAccount = await nodemailer.createTestAccount();
  console.log("Account created:", testAccount.user, testAccount.pass);
}
run();
