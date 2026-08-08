const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { setupDatabase } = require('../database');

const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ Por favor provee la ruta del archivo CSV.");
  console.error("Ejemplo: node scripts/import_csv.js ./mis_leads.csv");
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`❌ El archivo no existe: ${absolutePath}`);
  process.exit(1);
}

const importData = async () => {
  const db = await setupDatabase();
  let count = 0;
  let skipped = 0;

  console.log(`\n⏳ Leyendo archivo: ${filePath}...\n`);

  const results = [];

  fs.createReadStream(absolutePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Procesando ${results.length} filas...`);
      
      for (const row of results) {
        // Mapeo basado en las columnas de exportación de Instantly
        const email = row.email || row.Email || row.lead_email || '';
        if (!email) continue;

        const fName = row.firstName || row.first_name || row['First Name'] || '';
        const lName = row.lastName || row.last_name || row['Last Name'] || '';
        const name = row.name || row.Name || (fName ? `${fName} ${lName}`.trim() : 'Sin nombre');
        
        const company = row.companyName || row.company || row.Company || 'Sin empresa';
        const phone = row.phone || row.Phone || row.telefono || '';
        const title = row.jobTitle || row.title || row.Title || row['Job Title'] || row.cargo || '';
        
        // El mensaje puede venir en diferentes columnas dependiendo si es "Leads" o "Unibox"
        const message = row.reply_text_snippet || row.reply_text || row.message || row.Notes || 'Importado desde CSV.';

        try {
          // Check if lead already exists
          let lead = await db.get('SELECT id FROM leads WHERE email = ?', [email]);
          let leadId;

          if (!lead) {
            const result = await db.run(
              'INSERT INTO leads (email, name, company, phone, job_title, message) VALUES (?, ?, ?, ?, ?, ?)',
              [email, name, company, phone, title, message]
            );
            leadId = result.lastID;
            count++;
            console.log(`✅ Nuevo lead importado: ${email}`);
          } else {
            leadId = lead.id;
            skipped++; // Lead already existed, but we will still append the message
          }

          // Check if this exact message already exists for this lead (to avoid duplicates on multiple imports)
          const existingMsg = await db.get('SELECT id FROM messages WHERE lead_id = ? AND body = ?', [leadId, message]);
          if (!existingMsg) {
             await db.run("INSERT INTO messages (lead_id, body, direction) VALUES (?, ?, 'inbound')", [leadId, message]);
          }
        } catch (err) {
          console.error(`❌ Error importando ${email}:`, err.message);
        }
      }

      console.log('\n--- IMPORTACIÓN FINALIZADA ---');
      console.log(`🚀 Leads nuevos importados: ${count}`);
      console.log(`⏭️  Leads saltados (ya existían): ${skipped}`);
      console.log('------------------------------\n');
      process.exit(0);
    });
};

importData();
