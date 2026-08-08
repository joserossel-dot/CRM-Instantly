import React, { useState, useEffect } from 'react';
import { 
  Building2, Mail, MessageSquare, 
  CheckCircle2, Circle, Clock, Plus, Trash2, ChevronRight,
  Calendar as CalendarIcon, LayoutDashboard, X, FileText, MapPin, Link as LinkIcon, Paperclip,
  Users, Search, Phone, Briefcase
} from 'lucide-react';
import { fetchLeads, updateLeadStatus, deleteLead, addTask, updateTask, deleteTask, uploadFile } from './api';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const PIPELINE_STATUSES = [
  'Nuevo',
  'Información Enviada',
  'Cotización Enviada',
  'Reunión Agendada',
  'En Seguimiento',
  'Cerrado'
];

const QUICK_ACTIONS = [
  { label: '⚡ Acción rápida...', targetStatus: '', type: 'none' },
  { label: 'Enviar Información', targetStatus: 'Información Enviada', type: 'general' },
  { label: 'Enviar Cotización', targetStatus: 'Cotización Enviada', type: 'quote' },
  { label: 'Agendar Reunión/Llamada', targetStatus: 'Reunión Agendada', type: 'meeting' },
  { label: 'Hacer Seguimiento', targetStatus: 'En Seguimiento', type: 'follow_up' },
  { label: 'Cerrar Lead', targetStatus: 'Cerrado', type: 'general' }
];

export default function App() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban', 'calendar', 'contacts'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [actionModal, setActionModal] = useState(null); // { lead, action }
  const [modalData, setModalData] = useState({ date: '', time: '', location: '', file: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchLeads();
      setLeads(data);
      if (selectedLead) {
        const updatedSelected = data.find(l => l.id === selectedLead.id);
        if (updatedSelected) setSelectedLead(updatedSelected);
      }
    } catch (error) {
      console.error("Error fetching leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este contacto y todo su historial de conversaciones? Esta acción no se puede deshacer.')) return;
    try {
      await deleteLead(leadId);
      setLeads(leads.filter(l => l.id !== leadId));
      setSelectedLead(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error al eliminar contacto');
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead?.id === leadId) setSelectedLead({...selectedLead, status: newStatus});
    await updateLeadStatus(leadId, newStatus);
    loadData();
  };

  const handleQuickActionSelect = (e, lead) => {
    const actionLabel = e.target.value;
    e.target.value = ''; // Reset select
    if (!actionLabel) return;
    
    const action = QUICK_ACTIONS.find(a => a.label === actionLabel);
    if (action.type === 'general' && action.targetStatus !== 'Información Enviada') {
      handleStatusChange(lead.id, action.targetStatus);
    } else {
      setActionModal({ lead, action });
      setModalData({ date: '', time: '', location: '', file: null });
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { lead, action } = actionModal;
      let fileUrl = null;
      let filename = null;

      if (modalData.file) {
        const uploadRes = await uploadFile(modalData.file);
        fileUrl = uploadRes.url;
        filename = uploadRes.filename;
      }

      let due_date = null;
      if (modalData.date) {
        due_date = modalData.date + (modalData.time ? `T${modalData.time}:00` : 'T00:00:00');
      }

      const metadata = JSON.stringify({
        location: modalData.location,
        fileUrl,
        filename
      });

      const description = action.type === 'quote' && filename 
        ? `Cotización enviada: ${filename}` 
        : action.label;

      await addTask(lead.id, {
        description,
        due_date,
        task_type: action.type,
        metadata
      });

      await updateLeadStatus(lead.id, action.targetStatus);
      
      setActionModal(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al procesar la acción.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !selectedLead) return;
    const taskText = newTaskText;
    setNewTaskText('');
    await addTask(selectedLead.id, { description: taskText });
    loadData();
  };

  const handleToggleTask = async (task) => {
    await updateTask(task.id, { completed: !task.completed });
    loadData();
  };

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId);
    loadData();
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const allTasks = leads.flatMap(l => l.tasks.map(t => ({ ...t, lead: l }))).filter(t => t.due_date);
  allTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const filteredContacts = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* Top Navigation */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-400 rounded-lg flex items-center justify-center mr-3 shadow-inner">
            <span className="text-white font-bold">IN</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mini-CRM</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.open('http://localhost:3001/api/export', '_blank')}
            className="flex items-center px-4 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-bold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Exportar Excel
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'kanban' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Pipeline
            </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CalendarIcon className="w-4 h-4 mr-2" /> Agenda
          </button>
          <button 
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'contacts' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4 mr-2" /> Contactos
          </button>
        </div>
      </div>
      </div>

      {activeTab === 'kanban' && (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar / Pipeline */}
          <div className="w-1/3 min-w-[350px] max-w-[450px] bg-white border-r border-slate-200 flex flex-col h-full z-10 overflow-y-auto">
            <div className="p-4 space-y-4">
              {PIPELINE_STATUSES.map(status => {
                const statusLeads = leads.filter(l => l.status === status);
                return (
                  <div key={status} className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between px-2">
                      {status}
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                        {statusLeads.length}
                      </span>
                    </h3>
                    <div className="space-y-2 px-2">
                      {statusLeads.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-sm text-slate-400">
                          Sin leads
                        </div>
                      ) : (
                        statusLeads.map(lead => (
                          <button
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`w-full text-left p-4 rounded-xl transition-all duration-200 group relative overflow-hidden
                              ${selectedLead?.id === lead.id 
                                ? 'bg-primary-50 border-primary-200 shadow-sm ring-1 ring-primary-500' 
                                : 'bg-white border-slate-200 hover:border-primary-300 hover:shadow-md border shadow-sm'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-900 truncate pr-4">{lead.name}</span>
                              {lead.tasks?.length > 0 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap
                                  ${lead.tasks.every(t => t.completed) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                                `}>
                                  {lead.tasks.filter(t => t.completed).length}/{lead.tasks.length} tareas
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-slate-500 mt-2">
                              <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              <span className="truncate">{lead.company}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-slate-50/50 flex flex-col h-full relative overflow-y-auto">
            {selectedLead ? (
              <div className="max-w-4xl w-full mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 mb-8 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 flex space-x-3">
                    <select 
                      className="bg-primary-50 border border-primary-200 text-primary-700 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-2.5 font-bold cursor-pointer appearance-none pr-8 transition-colors hover:bg-primary-100 shadow-sm"
                      value=""
                      onChange={(e) => handleQuickActionSelect(e, selectedLead)}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%231d4ed8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                      {QUICK_ACTIONS.map(a => <option key={a.label} value={a.label} disabled={a.type === 'none'}>{a.label}</option>)}
                    </select>

                    <select 
                      className="bg-slate-50 border border-slate-200 text-slate-500 text-sm rounded-xl focus:ring-slate-500 focus:border-slate-500 block p-2.5 font-medium cursor-pointer appearance-none pr-8 transition-colors hover:bg-slate-100"
                      value={selectedLead.status}
                      onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                      {PIPELINE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    <button 
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 p-2.5 rounded-xl border border-red-100 transition-colors shadow-sm flex items-center justify-center"
                      title="Eliminar Conversación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-4 mb-6 pt-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
                      {selectedLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedLead.name}</h2>
                      <div className="flex items-center text-slate-500 mt-1 space-x-4">
                        <span className="flex items-center"><Building2 className="w-4 h-4 mr-1.5" /> {selectedLead.company}</span>
                        <span className="flex items-center"><Mail className="w-4 h-4 mr-1.5" /> {selectedLead.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Historial de Correos (Inbox) */}
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center border-t border-slate-100 pt-8">
                      <MessageSquare className="w-5 h-5 mr-2 text-primary-500" />
                      Historial de Conversación
                      <span className="ml-3 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {selectedLead.messages?.length || (selectedLead.message ? 1 : 0)}
                      </span>
                    </h3>
                    
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedLead.messages && selectedLead.messages.length > 0 ? (
                        selectedLead.messages.map((msg, idx) => (
                          <div key={msg.id || idx} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[90%] rounded-2xl p-5 shadow-sm ${msg.direction === 'outbound' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-slate-50 text-slate-700 rounded-bl-none border border-slate-200'}`}>
                              <p className="leading-relaxed text-sm whitespace-pre-wrap font-medium">
                                {msg.body}
                              </p>
                              <div className={`mt-3 flex items-center text-[11px] font-bold tracking-wider uppercase ${msg.direction === 'outbound' ? 'text-primary-200' : 'text-slate-400'}`}>
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                {new Date(msg.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : selectedLead.message ? (
                        // Fallback por si la migración falló
                        <div className="flex flex-col items-start">
                          <div className="max-w-[90%] bg-slate-50 text-slate-700 rounded-2xl rounded-bl-none p-5 border border-slate-200 shadow-sm">
                            <p className="leading-relaxed text-sm whitespace-pre-wrap font-medium">
                              {selectedLead.message}
                            </p>
                            <div className="mt-3 flex items-center text-[11px] font-bold tracking-wider uppercase text-slate-400">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {new Date(selectedLead.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          No hay mensajes registrados.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tasks / Commitments Section */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 mb-12">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                    Compromisos y Tareas
                    <span className="ml-3 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {selectedLead.tasks?.length || 0}
                    </span>
                  </h3>

                  <form onSubmit={handleAddTask} className="flex mb-8 relative">
                    <input
                      type="text"
                      placeholder="Añadir tarea rápida..."
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block w-full p-4 pr-16 transition-all hover:bg-slate-100 focus:bg-white"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!newTaskText.trim()}
                      className="absolute right-2 top-2 bottom-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </form>

                  <div className="space-y-3">
                    {selectedLead.tasks?.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <CheckCircle2 className="w-12 h-12 mb-3 text-slate-300" />
                        <p>No hay tareas pendientes.</p>
                      </div>
                    ) : (
                      selectedLead.tasks?.map(task => {
                        let meta = {};
                        try { if (task.metadata) meta = JSON.parse(task.metadata); } catch(e){}
                        
                        return (
                          <div 
                            key={task.id} 
                            className={`flex items-start p-4 rounded-2xl border transition-all duration-300 group
                              ${task.completed ? 'bg-slate-50 border-slate-200/60 opacity-75' : 'bg-white border-slate-200 hover:border-primary-300 hover:shadow-md'}`}
                          >
                            <button 
                              onClick={() => handleToggleTask(task)}
                              className="flex-shrink-0 mr-4 mt-0.5 text-slate-400 hover:text-primary-500 transition-colors focus:outline-none"
                            >
                              {task.completed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                            </button>
                            
                            <div className="flex-1">
                              <span className={`block text-sm transition-all duration-300 ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                                {task.description}
                              </span>
                              
                              {/* Metadata chips */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {task.due_date && (
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {format(parseISO(task.due_date), "d MMM, HH:mm", { locale: es })}
                                  </span>
                                )}
                                {meta.location && (
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                    <MapPin className="w-3 h-3 mr-1" /> {meta.location}
                                  </span>
                                )}
                                {meta.fileUrl && (
                                  <a href={`http://localhost:3001${meta.fileUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium border border-indigo-100 transition-colors">
                                    <Paperclip className="w-3 h-3 mr-1" /> {meta.filename || 'Adjunto'}
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="flex-shrink-0 ml-4 mt-0.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-lg font-medium text-slate-500">Selecciona un lead</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-8">Agenda Inteligente</h2>
            
            {allTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/60 shadow-sm">
                <CalendarIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-600">Tu agenda está limpia</h3>
                <p className="text-slate-400 mt-2">No hay actividades ni reuniones programadas próximamente.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {allTasks.map((task) => {
                  const dateObj = parseISO(task.due_date);
                  const isPastDate = isPast(dateObj) && !isToday(dateObj);
                  let meta = {};
                  try { if (task.metadata) meta = JSON.parse(task.metadata); } catch(e){}

                  return (
                    <div key={task.id} className={`flex bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${task.completed ? 'opacity-60 grayscale' : 'border-slate-200/60'}`}>
                      {/* Date Block */}
                      <div className={`w-32 flex flex-col items-center justify-center p-4 border-r ${isPastDate && !task.completed ? 'bg-red-50 border-red-100 text-red-700' : isToday(dateObj) ? 'bg-primary-50 border-primary-100 text-primary-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <span className="text-sm font-bold uppercase tracking-widest">{format(dateObj, 'MMM', { locale: es })}</span>
                        <span className="text-3xl font-black">{format(dateObj, 'dd')}</span>
                        <span className="text-xs font-semibold mt-1 bg-white/50 px-2 py-0.5 rounded">{format(dateObj, 'HH:mm')}</span>
                      </div>
                      
                      {/* Task Info */}
                      <div className="flex-1 p-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${task.task_type === 'meeting' ? 'bg-indigo-100 text-indigo-700' : task.task_type === 'quote' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {task.task_type === 'meeting' ? 'Reunión' : task.task_type === 'quote' ? 'Cotización' : 'Seguimiento'}
                          </span>
                          <span className="text-sm text-slate-500 font-medium">con <span className="font-bold text-slate-800">{task.lead.name}</span> ({task.lead.company})</span>
                        </div>
                        <h4 className={`text-lg font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.description}</h4>
                        
                        <div className="flex space-x-4 mt-3">
                          {meta.location && (
                            <a href={meta.location.startsWith('http') ? meta.location : '#'} target="_blank" rel="noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                              <LinkIcon className="w-4 h-4 mr-1" /> {meta.location.startsWith('http') ? 'Abrir Link' : meta.location}
                            </a>
                          )}
                          {meta.fileUrl && (
                            <a href={`http://localhost:3001${meta.fileUrl}`} target="_blank" rel="noreferrer" className="flex items-center text-sm text-slate-600 hover:text-slate-900 hover:underline">
                              <FileText className="w-4 h-4 mr-1" /> Ver Archivo Adjunto
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-center p-6 bg-slate-50 border-l border-slate-100">
                        <button 
                          onClick={() => handleToggleTask(task)}
                          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${task.completed ? 'bg-green-100 text-green-600' : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-primary-500 hover:text-primary-500 shadow-sm'}`}
                        >
                          {task.completed ? <CheckCircle2 className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7 opacity-50" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Directorio de Contactos</h2>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, empresa..." 
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-primary-500 focus:border-primary-500 w-80 shadow-sm transition-all hover:border-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Empresa / Cargo</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Estado Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContacts.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold mr-3 shadow-inner">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-bold text-slate-900">{lead.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-900 font-semibold mb-1">
                          <Building2 className="w-4 h-4 mr-1.5 text-slate-400 group-hover:text-primary-500 transition-colors" /> {lead.company}
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                          <Briefcase className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {lead.job_title || 'Sin cargo'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`mailto:${lead.email}`} className="flex items-center font-medium text-slate-600 hover:text-primary-600 transition-colors">
                          <Mail className="w-4 h-4 mr-1.5 text-slate-400" /> {lead.email}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="flex items-center font-medium text-slate-600 hover:text-primary-600 transition-colors">
                            <Phone className="w-4 h-4 mr-1.5 text-slate-400" /> {lead.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No disponible</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredContacts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p>No se encontraron contactos que coincidan con tu búsqueda.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal Overlay */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">{actionModal.action.label}</h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="space-y-5">
              
              {/* Conditional fields based on action type */}
              {(actionModal.action.type === 'meeting' || actionModal.action.type === 'follow_up') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha</label>
                    <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-primary-500 focus:border-primary-500" value={modalData.date} onChange={e => setModalData({...modalData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Hora</label>
                    <input required type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-primary-500 focus:border-primary-500" value={modalData.time} onChange={e => setModalData({...modalData, time: e.target.value})} />
                  </div>
                </div>
              )}

              {actionModal.action.type === 'meeting' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link de reunión o Lugar</label>
                  <input required type="text" placeholder="https://meet.google.com/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-primary-500 focus:border-primary-500" value={modalData.location} onChange={e => setModalData({...modalData, location: e.target.value})} />
                </div>
              )}

              {actionModal.action.type === 'quote' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Adjuntar Archivo de Cotización</label>
                  <input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" onChange={e => setModalData({...modalData, file: e.target.files[0]})} />
                </div>
              )}

              {actionModal.action.type === 'general' && actionModal.action.targetStatus === 'Información Enviada' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nota (Opcional)</label>
                  <input type="text" placeholder="Detalle de lo enviado..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-primary-500 focus:border-primary-500" value={modalData.location} onChange={e => setModalData({...modalData, location: e.target.value})} />
                </div>
              )}
              
              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center">
                  El lead pasará a <strong className="ml-1 text-primary-600">{actionModal.action.targetStatus}</strong>
                </span>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <span className="animate-spin border-2 border-white/20 border-t-white w-4 h-4 rounded-full mr-2"></span>
                  ) : null}
                  Confirmar Acción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
