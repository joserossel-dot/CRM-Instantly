const dbPromise = require('../database');

async function run() {
  try {
    const db = await dbPromise;
    
    const email = 'scorrada@ingevec.cl';
    const name = 'Sebastian Corrada';
    const company = 'Constructora Ingevec S.A.';
    const phone = '';
    const jobTitle = '';
    const messageBody = `Hola Sebastián, bien y tu?
Gracias por tu respuesta!
Sí, hoy en día tenemos una cartera de clientes que está operando bajo esta metodología, con excelentes resultados.
¿Te interesa que agendemos una reunión para ver más en detalle cómo podemos apoyarlos?
Quedo atento a tu respuesta.
Atte.
Sebastián Pérez

On Wednesday, Jun 24, 2026 at 9:39 am scorrada@ingevec.cl wrote:
Hola Sebastian, como estas?, sí me interesa que podamos evaluar, hoy en dia estas con algunas constructora trabajando bajo esta metodología?
Saludos!

El mié, 24 jun 2026 a las 9:29, Sebastian Perez escribió:
Hola Sebastian, que tal.
Sé que coordinar la logística de seguridad para equipos en terreno es un desafío constante, especialmente cuando los plazos de entrega de los proveedores tradicionales son de 3 a 5 días hábiles.
Nosotros rompemos esa inercia con entregas inmediatas. Actuamos como tu bodega de respaldo para que, ante cualquier imprevisto o ingreso de personal nuevo, el equipo esté disponible en faena en menos de 24 horas.
¿Te interesaría explorar cómo estamos optimizando la entrega de insumos críticos para mejorar tu disponibilidad operativa?
¿Estarías abierto a ver cómo estamos acortando los tiempos de reposición para evitar detenciones en Constructora Ingevec S.A.?
Saludos`;

    // 1. Insert or Get Lead
    let lead = await db.get("SELECT id FROM leads WHERE email = ? OR company LIKE '%Ingevec%'", [email]);
    let leadId;
    if (!lead) {
      const result = await db.run(
        'INSERT INTO leads (email, name, company, phone, job_title, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, name, company, phone, jobTitle, "Sebastian de Ingevec mostró interés en evaluar la metodología. Se propuso reunión.", "En Conversación"]
      );
      leadId = result.lastID;
    } else {
      leadId = lead.id;
      await db.run("UPDATE leads SET status = 'En Conversación', message = ? WHERE id = ?", ["Sebastian de Ingevec mostró interés en evaluar la metodología. Se propuso reunión.", leadId]);
    }
    
    // 2. Insert Message Thread (outbound)
    await db.run(
      "INSERT INTO messages (lead_id, body, direction) VALUES (?, ?, 'outbound')",
      [leadId, messageBody]
    );
    
    // 3. Insert Tasks
    await db.run(
      "INSERT INTO tasks (lead_id, description, task_type) VALUES (?, ?, 'follow_up')",
      [leadId, "Hacer seguimiento con Sebastian (Ingevec) para confirmar fecha y hora de la reunión propuesta."]
    );
    
    console.log("SUCCESS");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
