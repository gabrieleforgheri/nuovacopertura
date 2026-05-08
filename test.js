import fetch from 'node-fetch';

async function test() {
  const payload = {
    nome: "Test",
    cognome: "Test",
    email: "test@test.com",
    servizio: "Manutenzione",
    messaggio: "Test"
  };
  const res = await fetch('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(await res.json());
}
test();
