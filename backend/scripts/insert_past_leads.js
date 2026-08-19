const dbPromise = require('../database');

const leadsToInsert = [
  {
    email: 'fvillalobos@axisdc.cl',
    name: 'Felipe Villalobos',
    company: 'Axis Desarrollos Constructivos SA',
    phone: '',
    jobTitle: '',
    initialSummary: 'Felipe consultó por catálogo de productos, ejecutivo de contacto y despacho a regiones (sur y austral).',
    status: 'En Conversación',
    messageBody: `Hola Felipe,
Gracias por tu interés y por tu correo.
Con gusto respondo a tus consultas:
Catálogo de productos: Puedes revisar nuestro catálogo en nuestra pagina www.dimasan.cl
Contacto: Tendrás un ejecutivo personalizado para atender todas tus solicitudes, y contar con una asesoría integral, acompañándote hasta la post venta. Yo estaré acompañando en este proceso y apoyando en lo que necesites. Te dejo sus datos:
Nombre: Karen Vega
Correo: kvega@dimasan.cl
Tel: +56989444121
Venta en regiones: Sí, disponemos de venta y despacho a todo Chile, incluyendo la zona sur (Puerto Montt) y la zona austral (Punta Arenas).
Me gustaría mucho conversar para entender mejor sus necesidades y cómo nuestro modelo de entrega por demanda puede optimizar su flujo logístico.
¿Te parece si agendamos una reunión ?
Quedo atento,
Sebastian
Gerente Comercial
Dimasan`,
    direction: 'outbound',
    taskDescription: 'Seguimiento con Felipe (Axis) para coordinar reunión propuesta.',
    taskType: 'follow_up'
  },
  {
    email: 'jacqueline.munoz@traza.cl',
    name: 'Jacqueline Muñoz Targarona',
    company: 'Traza Ltda',
    phone: '',
    jobTitle: '',
    initialSummary: 'Jacqueline confirmó reunión para el 27 de mayo a las 12:30 y envió las casillas de intercambio de facturación de las filiales de Traza.',
    status: 'En Conversación',
    messageBody: `ok, gracias
Casilla electrónica para emitir documento tributario:
INGENIERIA E INVERSIONES SANTA CAMILA LIMITADA intercambio.santacamila@docele.cl
TRAZA RENT A CAR: intercambio.trazarent@docele.cl
TRAZA INMOBILIARIA LIMITADA : intercambio.trazainmobiliaria@docele.cl
El mar, 26 may 2026 a las 16:33, Sebastian Perez (<sebastian.perez@dimasanchile.online>) escribió:
Jacqueline,
Perfecto, muchas gracias por la confirmación.
Queda agendada la reunión para mañana, miércoles 27 de mayo, a las 12:30 hrs. Les enviaré la invitación a través de Microsoft Teams en breve.
Saludos cordiales,
Sebastian Perez
On Tuesday, May 26, 2026 at 2:03 pm jacqueline.munoz@traza.cl wrote:
12:30 esta bien`,
    direction: 'inbound',
    taskDescription: 'Realizar reunión con Jacqueline (Traza) y enviar propuesta de flexibilidad de pago de EPPs.',
    taskType: 'meeting'
  },
  {
    email: 'jfuentes@axisdc.cl',
    name: 'Javier Fuentes',
    company: 'Axis Desarrollos Constructivos SA',
    phone: '',
    jobTitle: '',
    initialSummary: 'Javier derivó el contacto con Alexander Secul (asecul@axisdc.cl), encargado del área de espacio en bodega.',
    status: 'En Conversación',
    messageBody: `Hola Javier,
Muchas gracias por la información y por referirme con la persona correcta.
Me pondré en contacto con Alexander Secul.
Saludos,
Sebastián Pérez
On Thursday, May 28, 2026 at 10:11 am jfuentes@axisdc.cl wrote:
Sebastián,
Te pido te comuniques con Alexander Secul (asecul@axisdc.cl) quien es el encargado del área.
Saludos.`,
    direction: 'outbound',
    taskDescription: 'Contactar a Alexander Secul (asecul@axisdc.cl), encargado de bodega de Axis, derivado por Javier Fuentes.',
    taskType: 'follow_up'
  },
  {
    email: 'tsantibanez@globaldata.cl',
    name: 'Thiare Santibañez Torres',
    company: 'GlobalData',
    phone: '+56 9 5816 4980',
    jobTitle: 'Jefa de Mejoramiento Continuo',
    initialSummary: 'Contacto establecido para proponer alianza estratégica con GlobalData.',
    status: 'En Conversación',
    messageBody: `Re: Alejandro, una alianza estratégica con GlobalData
Enviado a Thiare Santibañez (tsantibanez@globaldata.cl) con copia a pchamorro@globaldata.cl.`,
    direction: 'outbound',
    taskDescription: 'Hacer seguimiento con Thiare Santibañez (GlobalData) sobre la propuesta de alianza estratégica.',
    taskType: 'follow_up'
  },
  {
    email: 'katyana.silva@bailacthor.com',
    name: 'Katyana Silva',
    company: 'Empresas Bailac Thor',
    phone: '',
    jobTitle: '',
    initialSummary: 'Envío de Brochure de Dimasan para optimización de bodega en Empresas Bailac Thor.',
    status: 'En Conversación',
    messageBody: `Re: Katyana, Optimiza la bodega de Empresas Bailac Thor
Adjunto: Brochure Dimasan.pdf
Enviado a katyana.silva@bailacthor.com con copia oculta a sperez@copergo.cl.`,
    direction: 'outbound',
    taskDescription: 'Seguimiento con Katyana Silva (Bailac Thor) para ver comentarios sobre el Brochure de Dimasan.',
    taskType: 'follow_up'
  },
  {
    email: 'josejarpa@corralesdelsur.cl',
    name: 'José Jarpa O.',
    company: 'Corrales del Sur',
    phone: '',
    jobTitle: '',
    initialSummary: 'José Jarpa solicitó el envío del estándar de imagen y protección para la operación.',
    status: 'En Conversación',
    messageBody: `si mandalo`,
    direction: 'inbound',
    taskDescription: 'Enviar estándar de imagen y protección para la operación de Corrales del Sur a José Jarpa.',
    taskType: 'follow_up'
  },
  {
    email: 'fnava@blunding.com',
    name: 'Fernanda Nava',
    company: 'Blunding',
    phone: '+56951997527',
    jobTitle: 'Analista de Compras Nacionales',
    initialSummary: 'Fernanda solicitó el catálogo de productos de Dimasan. Sebastián le envió los catálogos y le ofreció mejorar precios en ropa corporativa y zapatos.',
    status: 'En Conversación',
    messageBody: `Hola Fernanda, ¿cómo estás?
Adjunto los catálogos. Te aprovecho de comentar que ahí no está todo lo que comercializamos, si gusta me envías que tipo de ropa corporativa y zapatos usan, para enviarte las fichas técnicas y mejorar precios y servicio.
Quedo atento a tu respuesta.
Atte.
Sebastián Pérez
On Tuesday, Aug 11, 2026 at 10:59 am fnava@blunding.com wrote:
Buen dia, Estimado
Favor enviar catalogo de productos
Saludos
Fernanda Nava.
Analista de Compras Nacionales
Tel: (562) 23505971
Celular/ Whatsapp: (+569) 5199 7527
fnava@blunding.com
www.blunding.com`,
    direction: 'outbound',
    taskDescription: 'Seguimiento con Fernanda Nava (Blunding) para ofrecer cotización de ropa corporativa y zapatos.',
    taskType: 'follow_up'
  }
];

async function run() {
  try {
    const db = await dbPromise;
    
    for (const item of leadsToInsert) {
      console.log(`Processing lead: ${item.email}...`);
      
      // 1. Insert or Get Lead
      let lead = await db.get("SELECT id FROM leads WHERE email = ?", [item.email]);
      let leadId;
      if (!lead) {
        const result = await db.run(
          'INSERT INTO leads (email, name, company, phone, job_title, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.email, item.name, item.company, item.phone, item.jobTitle, item.initialSummary, item.status]
        );
        leadId = result.lastID;
        console.log(`Created Lead ID: ${leadId}`);
      } else {
        leadId = lead.id;
        await db.run("UPDATE leads SET status = ?, message = ? WHERE id = ?", [item.status, item.initialSummary, leadId]);
        console.log(`Found existing Lead ID: ${leadId}`);
      }
      
      // 2. Insert Message Thread
      await db.run(
        "INSERT INTO messages (lead_id, body, direction) VALUES (?, ?, ?)",
        [leadId, item.messageBody, item.direction]
      );
      console.log("Inserted message thread.");
      
      // 3. Add follow up task
      await db.run(
        "INSERT INTO tasks (lead_id, description, task_type) VALUES (?, ?, ?)",
        [leadId, item.taskDescription, item.taskType]
      );
      console.log("Created task.");
    }
    
    console.log("SUCCESS: All leads imported successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();
