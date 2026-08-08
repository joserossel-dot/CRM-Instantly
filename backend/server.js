const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dbPromise = require('./database');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

const uploadDir = process.env.RENDER ? '/data/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// ==========================================
// 1. Webhook Endpoint para Instantly
// ==========================================
app.post('/api/webhook/instantly', async (req, res) => {
  try {
    const db = await dbPromise;
    // Instantly payload structure can vary, we try to extract common fields
    const { 
      email, lead_email, 
      first_name, firstName, 
      last_name, lastName, 
      name, 
      company, companyName, 
      phone, telefono,
      title, jobTitle, cargo, job_title,
      message, content, text, reply_text, reply_text_snippet 
    } = req.body;
    
    const leadEmail = email || lead_email || '';
    const fName = first_name || firstName || '';
    const lName = last_name || lastName || '';
    const leadName = name || (fName ? `${fName} ${lName}`.trim() : 'Sin nombre');
    const leadCompany = company || companyName || 'Sin empresa';
    const leadPhone = phone || telefono || '';
    const leadTitle = title || jobTitle || cargo || job_title || '';
    
    // Priorizamos 'reply_text_snippet' porque viene sin el historial del correo (sin los > El 07-08...)
    const leadMessage = reply_text_snippet || reply_text || message || content || text || 'Sin mensaje legible.';

    if (!leadEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if lead exists
    let lead = await db.get('SELECT id FROM leads WHERE email = ?', [leadEmail]);
    let leadId;

    if (lead) {
      leadId = lead.id;
      // You could update lead fields here if needed, but for now we just append the message
    } else {
      const result = await db.run(
        'INSERT INTO leads (email, name, company, phone, job_title, message) VALUES (?, ?, ?, ?, ?, ?)',
        [leadEmail, leadName, leadCompany, leadPhone, leadTitle, leadMessage]
      );
      leadId = result.lastID;
    }

    // Insert message into thread
    await db.run(
      "INSERT INTO messages (lead_id, body, direction) VALUES (?, ?, 'inbound')",
      [leadId, leadMessage]
    );

    res.status(201).json({ success: true, leadId });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==========================================
// 2. API Endpoints para el Dashboard (CRUD)
// ==========================================

// Obtener todos los leads con sus tareas
app.get('/api/leads', async (req, res) => {
  try {
    const db = await dbPromise;
    const leads = await db.all('SELECT * FROM leads ORDER BY created_at DESC');
    
    for (let lead of leads) {
      const tasks = await db.all('SELECT * FROM tasks WHERE lead_id = ? ORDER BY due_date ASC', [lead.id]);
      const messages = await db.all('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC', [lead.id]);
      lead.tasks = tasks.map(t => ({
        ...t,
        completed: t.completed === 1
      }));
      lead.messages = messages;
    }

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch specific lead
app.get('/api/leads/:id', async (req, res) => {
  const db = await dbPromise;
  const lead = await db.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  
  const tasks = await db.all('SELECT * FROM tasks WHERE lead_id = ? ORDER BY created_at DESC', [req.params.id]);
  const messages = await db.all('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC', [req.params.id]);
  
  // Fallback to original message field if no messages exist (backward compatibility)
  if (messages.length === 0 && lead.message) {
      messages.push({
          id: 'legacy',
          body: lead.message,
          direction: 'inbound',
          created_at: lead.created_at
      });
  }

  res.json({ ...lead, tasks, messages });
});

// Delete lead
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const db = await dbPromise;
        const leadId = req.params.id;
        
        // Ensure cascading deletes manually in case PRAGMA foreign_keys is off
        await db.run('DELETE FROM tasks WHERE lead_id = ?', [leadId]);
        await db.run('DELETE FROM messages WHERE lead_id = ?', [leadId]);
        
        const result = await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json({ message: 'Lead deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Actualizar estado de un lead
app.put('/api/leads/:id/status', async (req, res) => {
  try {
    const db = await dbPromise;
    const { status } = req.body;
    const { id } = req.params;
    
    const result = await db.run('UPDATE leads SET status = ? WHERE id = ?', [status, id]);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Añadir una tarea a un lead
app.post('/api/leads/:id/tasks', async (req, res) => {
  try {
    const db = await dbPromise;
    const { description, due_date, task_type, metadata } = req.body;
    const { id } = req.params;
    
    if (!description) return res.status(400).json({ error: 'Description is required' });

    const result = await db.run(
      'INSERT INTO tasks (lead_id, description, due_date, task_type, metadata) VALUES (?, ?, ?, ?, ?)', 
      [id, description, due_date || null, task_type || 'general', metadata || null]
    );
    
    res.status(201).json({ id: result.lastID, lead_id: Number(id), description, due_date, task_type, metadata, completed: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subir archivo
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname });
});

// Actualizar una tarea (tachar / editar)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const db = await dbPromise;
    const { id } = req.params;
    const { description, completed } = req.body;
    
    // Construir query dinámicamente según qué enviaron
    const updates = [];
    const params = [];
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (completed !== undefined) {
      updates.push('completed = ?');
      params.push(completed ? 1 : 0);
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    params.push(id);
    const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    
    const result = await db.run(sql, params);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una tarea
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const db = await dbPromise;
    const { id } = req.params;
    const result = await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar a Excel
app.get('/api/export', async (req, res) => {
  try {
    const db = await dbPromise;
    const leads = await db.all('SELECT * FROM leads ORDER BY created_at DESC');
    
    // Preparar Sheet 1: Resumen de Prospectos
    const leadsOverview = leads.map(lead => ({
      ID: lead.id,
      Nombre: lead.name,
      Empresa: lead.company,
      Email: lead.email,
      Teléfono: lead.phone,
      Cargo: lead.job_title,
      Estado: lead.status,
      'Fecha Creación': new Date(lead.created_at).toLocaleString()
    }));

    // Preparar Sheet 2: Evolución Histórica
    // Fetch all messages and tasks
    const messages = await db.all('SELECT m.*, l.name as lead_name, l.company FROM messages m JOIN leads l ON m.lead_id = l.id ORDER BY m.created_at ASC');
    const tasks = await db.all('SELECT t.*, l.name as lead_name, l.company FROM tasks t JOIN leads l ON t.lead_id = l.id ORDER BY t.created_at ASC');

    const timeline = [];
    
    messages.forEach(m => {
      timeline.push({
        Fecha: new Date(m.created_at).toLocaleString(),
        Timestamp: new Date(m.created_at).getTime(),
        Empresa: m.company,
        Contacto: m.lead_name,
        Tipo: m.direction === 'inbound' ? 'Mensaje Entrante' : 'Mensaje Saliente',
        Descripción: m.body
      });
    });

    tasks.forEach(t => {
      timeline.push({
        Fecha: new Date(t.created_at).toLocaleString(),
        Timestamp: new Date(t.created_at).getTime(),
        Empresa: t.company,
        Contacto: t.lead_name,
        Tipo: 'Tarea/Acción',
        Descripción: `[${t.task_type}] ${t.description} (Estado: ${t.completed ? 'Completada' : 'Pendiente'})`
      });
    });

    // Ordenar cronológicamente
    timeline.sort((a, b) => a.Timestamp - b.Timestamp);
    
    // Remover timestamp auxiliar
    const evolutionData = timeline.map(({ Timestamp, ...rest }) => rest);

    // Crear workbook
    const wb = xlsx.utils.book_new();
    
    const wsOverview = xlsx.utils.json_to_sheet(leadsOverview);
    xlsx.utils.book_append_sheet(wb, wsOverview, "Resumen");

    const wsEvolution = xlsx.utils.json_to_sheet(evolutionData);
    xlsx.utils.book_append_sheet(wb, wsEvolution, "Evolución");

    // Escribir a buffer
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="contactos_evolucion.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Error exportando excel' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
