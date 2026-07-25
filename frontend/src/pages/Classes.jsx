import { useState, useEffect } from 'react'
import api from '../utils/api'
import Modal from '../components/ui/Modal'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function Classes() {
  const [classesList, setClassesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [triggerFetch, setTriggerFetch] = useState(0)

  // Create/Edit modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    instructor: '',
    capacidad_max: 20,
    horarios: [{ dia: 'Lunes', hora: '07:00' }],
    descripcion: ''
  })
  const [submitError, setSubmitError] = useState('')

  // View members modal
  const [membersOpen, setMembersOpen] = useState(false)
  const [membersList, setMembersList] = useState([])
  const [membersClass, setMembersClass] = useState(null)

  // Enrollment in edit modal
  const [enrollOptions, setEnrollOptions] = useState([])
  const [enrollSearch, setEnrollSearch] = useState('')
  const [selectedEnrollId, setSelectedEnrollId] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    let active = true
    async function loadClasses() {
      setLoading(true)
      try {
        const res = await api.get('/classes')
        if (active) setClassesList(res.data)
      } catch (err) {
        console.error('Error fetching classes:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadClasses()
    return () => { active = false }
  }, [triggerFetch])

  // ── Open create form ──
  function openCreateForm() {
    setEditingClass(null)
    setForm({
      nombre: '',
      instructor: '',
      capacidad_max: 20,
      horarios: [{ dia: 'Lunes', hora: '07:00' }],
      descripcion: ''
    })
    setSubmitError('')
    setFormOpen(true)
  }

  // ── Open edit form ──
  function openEditForm(cls) {
    setEditingClass(cls)
    setForm({
      nombre: cls.nombre,
      instructor: cls.instructor || '',
      capacidad_max: cls.capacidad_max,
      horarios: cls.horario || [{ dia: 'Lunes', hora: '07:00' }],
      descripcion: cls.descripcion || ''
    })
    setSubmitError('')
    setSelectedEnrollId('')
    setEnrollSearch('')
    setFormOpen(true)
    api.get('/members', { params: { status: 'todos' } })
      .then(res => setEnrollOptions(res.data))
      .catch(err => console.error('Error fetching members:', err))
  }

  // ── Handle form input ──
  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleHorarioChange(index, field, value) {
    const horarios = [...form.horarios]
    horarios[index] = { ...horarios[index], [field]: value }
    setForm(prev => ({ ...prev, horarios }))
  }

  function addHorario() {
    setForm(prev => ({ ...prev, horarios: [...prev.horarios, { dia: 'Lunes', hora: '07:00' }] }))
  }

  function removeHorario(index) {
    setForm(prev => ({ ...prev, horarios: prev.horarios.filter((_, i) => i !== index) }))
  }

  // ── Submit create/update ──
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    try {
      const payload = {
        nombre: form.nombre,
        instructor: form.instructor || null,
        capacidad_max: Number(form.capacidad_max),
        horario: form.horarios,
        descripcion: form.descripcion || null
      }

      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, payload)
      } else {
        await api.post('/classes', payload)
      }

      setFormOpen(false)
      setTriggerFetch(v => v + 1)
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Error al guardar la clase')
    }
  }

  // ── View enrolled members ──
  async function openViewMembers(cls) {
    setMembersClass(cls)
    setMembersList([])
    setMembersOpen(true)
    try {
      const res = await api.get(`/classes/${cls.id}/members`)
      setMembersList(res.data)
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }

  // ── Delete class ──
  async function handleDelete(classId) {
    try {
      await api.delete(`/classes/${classId}`)
      setDeleteConfirm(null)
      setTriggerFetch(v => v + 1)
    } catch (err) {
      console.error('Error deleting class:', err)
      alert(err.response?.data?.error || 'Error al eliminar la clase')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Clases</h2>
          <p className="page-subtitle">{classesList.length} clases activas</p>
        </div>
        <button className="btn btn-primary" id="btn-add-class" onClick={openCreateForm}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva clase
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gold)' }}>Cargando clases...</p>
        </div>
      ) : classesList.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <p>No se encontraron clases programadas</p>
          <button className="btn btn-primary btn-sm" onClick={openCreateForm}>Crear primera clase</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {classesList.map(cls => {
            const pct = Math.round((cls.inscritos / cls.capacidad_max) * 100)
            const isFull = cls.inscritos >= cls.capacidad_max
            const scheduleText = (cls.horario || []).map(h => `${h.dia.slice(0,3)} ${h.hora}`).join(' · ')

            return (
              <div key={cls.id} className="card card-hover">
                <div className="card-header">
                  <span className="card-title">{cls.nombre}</span>
                  <span className={`badge ${isFull ? 'badge-danger' : 'badge-success'}`}>
                    {isFull ? 'Llena' : 'Disponible'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Instructor</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{cls.instructor || 'Sin Asignar'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Horario</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{scheduleText || 'Sin horarios'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Capacidad</span>
                    <span style={{ fontWeight: 600, color: isFull ? 'var(--danger)' : 'var(--text)' }}>
                      {cls.inscritos}/{cls.capacidad_max}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(pct, 100)}%`,
                      background: isFull
                        ? 'var(--danger)'
                        : pct > 75
                          ? 'var(--warning)'
                          : 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
                      borderRadius: 99,
                      transition: 'width 0.6s var(--ease)',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openViewMembers(cls)}>
                    Ver miembros
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditForm(cls)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteConfirm(cls)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingClass ? 'Editar clase' : 'Nueva clase'}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="input-group">
            <label className="input-label" htmlFor="class-name">Nombre de la clase</label>
            <input
              id="class-name" className="input" type="text" name="nombre"
              placeholder="e.g. CrossFit Intenso" value={form.nombre}
              onChange={handleChange} required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="class-instructor">Instructor</label>
            <input
              id="class-instructor" className="input" type="text" name="instructor"
              placeholder="e.g. Roberto Silva" value={form.instructor}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="class-capacity">Capacidad máxima</label>
            <input
              id="class-capacity" className="input" type="number" name="capacidad_max"
              min="1" max="100" value={form.capacidad_max}
              onChange={handleChange} required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Horarios</label>
            {form.horarios.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <select
                  className="input" style={{ flex: 1 }}
                  value={h.dia} onChange={e => handleHorarioChange(i, 'dia', e.target.value)}
                >
                  {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  className="input" style={{ width: '80px' }} type="time"
                  value={h.hora} onChange={e => handleHorarioChange(i, 'hora', e.target.value)}
                />
                {form.horarios.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => removeHorario(i)} style={{ color: 'var(--danger)' }}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addHorario}>
              + Agregar horario
            </button>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="class-desc">Descripción (opcional)</label>
            <textarea
              id="class-desc" className="input" name="descripcion" rows={3}
              placeholder="e.g. Clase de alta intensidad para todos los niveles" value={form.descripcion}
              onChange={handleChange}
            />
          </div>

          {submitError && <p className="input-error-msg">{submitError}</p>}

          {/* ── Enrollment section (only when editing) ── */}
          {editingClass && (
            <div className="input-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <label className="input-label">
                Miembros inscritos: <strong>{editingClass.inscritos}/{editingClass.capacidad_max}</strong>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <svg style={{
                    position: 'absolute', left: 10, top: '50%', marginTop: -8,
                    color: 'var(--text-faint)', pointerEvents: 'none'
                  }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="input"
                    type="text"
                    placeholder="Buscar miembro por nombre..."
                    value={enrollSearch}
                    onChange={e => {
                      setEnrollSearch(e.target.value)
                      setSelectedEnrollId('')
                    }}
                    style={{ paddingLeft: '2rem' }}
                  />
                  {enrollSearch && !selectedEnrollId && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', maxHeight: 180, overflowY: 'auto',
                      zIndex: 10, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}>
                      {enrollOptions
                        .filter(m => m.nombre.toLowerCase().includes(enrollSearch.toLowerCase()))
                        .map(m => (
                          <div key={m.id}
                            onClick={() => {
                              setSelectedEnrollId(m.id)
                              setEnrollSearch(m.nombre)
                            }}
                            style={{
                              padding: '0.5rem 0.75rem', cursor: 'pointer',
                              fontSize: '0.875rem', color: 'var(--text)',
                              borderBottom: '1px solid var(--border)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {m.nombre}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                              {m.plan_nombre || ''}
                            </span>
                          </div>
                        ))}
                      {enrollOptions.filter(m => m.nombre.toLowerCase().includes(enrollSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Sin resultados
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button" className="btn btn-primary btn-sm"
                  disabled={!selectedEnrollId || enrolling}
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    setEnrolling(true)
                    try {
                      await api.post(`/classes/${editingClass.id}/enroll`, { member_id: Number(selectedEnrollId) })
                      setSelectedEnrollId('')
                      setEnrollSearch('')
                      setEditingClass(prev => ({ ...prev, inscritos: prev.inscritos + 1 }))
                      setTriggerFetch(v => v + 1)
                    } catch (err) {
                      alert(err.response?.data?.error || 'Error al inscribir')
                    } finally {
                      setEnrolling(false)
                    }
                  }}
                >
                  {enrolling ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              {editingClass ? 'Guardar cambios' : 'Crear clase'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Members Modal ── */}
      <Modal open={membersOpen} onClose={() => setMembersOpen(false)} title={`Miembros - ${membersClass?.nombre || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {membersList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No hay miembros registrados aún
            </p>
          ) : (
            membersList.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.625rem 0', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}>{m.nombre}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.plan_nombre || 'Sin plan'}</div>
                </div>
                <span className={`badge ${
                  m.estado === 'activo' ? 'badge-success' :
                  m.estado === 'por_vencer' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {m.estado === 'activo' ? 'Al día' : m.estado === 'por_vencer' ? 'Por vencer' : 'Vencido'}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={() => setMembersOpen(false)}>Cerrar</button>
        </div>
      </Modal>

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Eliminar clase</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0', lineHeight: 1.5 }}>
              ¿Estás seguro de eliminar la clase <strong style={{ color: 'var(--text)' }}>{deleteConfirm.nombre}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
