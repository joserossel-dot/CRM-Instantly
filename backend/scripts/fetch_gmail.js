require('dotenv').config({ path: __dirname + '/../.env' });
const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs');
const path = require('path');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("❌ Por favor configura GMAIL_USER y GMAIL_APP_PASSWORD en el archivo backend/.env");
  process.exit(1);
}

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
    },
    logger: false 
});

const main = async () => {
    try {
        console.log(`Conectando a Gmail (${GMAIL_USER})...`);
        await client.connect();
        console.log('✅ Conectado exitosamente.');

        let lock = await client.getMailboxLock('INBOX');
        try {
            console.log('Buscando correos recientes...');
            
            // Buscar los últimos 50 correos para no saturar
            const messages = [];
            
            for await (let msg of client.fetch('1:*', { source: true, envelope: true })) {
                if (msg.source) {
                  const parsed = await simpleParser(msg.source);
                  messages.push({
                      date: parsed.date,
                      subject: parsed.subject,
                      from: parsed.from?.text,
                      to: parsed.to?.text,
                      text: parsed.text
                  });
                }
            }
            
            // Solo tomar los ultimos 30 para la prueba inicial
            const ultimos = messages.slice(-30);

            console.log(`Se descargaron ${ultimos.length} correos para análisis.`);
            
            const outputPath = path.resolve(__dirname, '../gmail_historico.json');
            fs.writeFileSync(outputPath, JSON.stringify(ultimos, null, 2));
            console.log(`✅ Correos guardados localmente en: ${outputPath}`);
            console.log(`👉 Ahora avísale a la IA que ya corriste el script para que los lea y analice.`);
            
        } finally {
            lock.release();
        }

        await client.logout();
    } catch (err) {
        console.error('❌ Error en IMAP:', err.message);
    }
};

main();
