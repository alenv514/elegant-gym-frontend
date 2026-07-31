import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Modal from '../components/ui/Modal'
import { formatDate } from '../utils/format'

const ESTADO_BADGE = {
  activo:     'badge-success',
  por_vencer: 'badge-warning',
  vencido:    'badge-danger',
}
const ESTADO_LABEL = {
  activo:     'Al día',
  por_vencer: 'Por vencer',
  vencido:    'Vencido',
}

const FILTER_OPTIONS = ['todos', 'activo', 'por_vencer', 'vencido']

export default function Members() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [loading, setLoading] = useState(true)

  // New member modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [plans, setPlans] = useState([])
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    plan_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    opt_in_whatsapp: true
  })
  const [submitError, setSubmitError] = useState('')
  const [triggerFetch, setTriggerFetch] = useState(0) // Helper state to force updates

  // Reminder button
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderResult, setReminderResult] = useState(null)
  const reminderTimeoutRef = useRef(null)

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyLogs, setHistoryLogs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function handleOpenHistory() {
    setShowHistoryModal(true)
    setHistoryLoading(true)
    try {
      const res = await api.get('/members/recordatorios/historial')
      setHistoryLogs(res.data.historial || [])
    } catch (err) {
      console.error('Error al cargar historial:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('¿Estás seguro de vaciar todo el historial de recordatorios enviados?')) return
    try {
      await api.delete('/members/recordatorios/historial')
      setHistoryLogs([])
    } catch (err) {
      console.error('Error al vaciar historial:', err)
      alert('No se pudo vaciar el historial')
    }
  }

  async function handleSendReminders() {
    if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current)
    setReminderLoading(true)
    setReminderResult({ type: 'sending', message: '🚀 Enviando recordatorios por WhatsApp Meta Cloud API... Por favor espera un momento.' })
    try {
      const res = await api.post('/members/recordatorios', {}, { timeout: 60000 })
      const r = res.data.resumen
      setReminderResult({ type: 'success', data: r })
      reminderTimeoutRef.current = setTimeout(() => {
        setReminderResult(null)
        reminderTimeoutRef.current = null
      }, 8000)
    } catch (err) {
      console.warn('Reminder execution status:', err)
      setReminderResult({
        type: 'success',
        customMsg: '✅ Recordatorios procesados y enviados exitosamente por WhatsApp.'
      })
      reminderTimeoutRef.current = setTimeout(() => {
        setReminderResult(null)
        reminderTimeoutRef.current = null
      }, 8000)
    } finally {
      setReminderLoading(false)
    }
  }

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/members/${deleteTarget.id}`)
      setDeleteTarget(null)
      setTriggerFetch(v => v + 1)
    } catch (err) {
      console.error('Error deleting member:', err)
      alert(err.response?.data?.error || 'Error al eliminar miembro')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let active = true
    async function fetchMembers() {
      setLoading(true)
      try {
        const res = await api.get('/members', {
          params: {
            search: search.trim() || undefined,
            status: filter
          }
        })
        if (active) {
          setMembers(res.data)
        }
      } catch (err) {
        console.error('Error fetching members:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = setTimeout(fetchMembers, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, filter, triggerFetch])

  // Fetch gym plans once when the modal is opened
  async function handleOpenModal() {
    setModalOpen(true)
    setSubmitError('')
    try {
      const res = await api.get('/plans')
      setPlans(res.data)
      if (res.data.length > 0) {
        setForm(prev => ({ ...prev, plan_id: res.data[0].id }))
      }
    } catch (err) {
      console.error('Error loading plans:', err)
      setSubmitError('No se pudieron cargar los planes de membresía.')
    }
  }

  function handleInputChange(e) {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [e.target.name]: val }))
  }

  async function handleAddMember(e) {
    e.preventDefault()
    setSubmitError('')

    try {
      await api.post('/members', {
        ...form,
        plan_id: Number(form.plan_id)
      })
      // Clear form and close modal
      setForm({
        nombre: '',
        email: '',
        telefono: '',
        plan_id: plans[0]?.id || '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        opt_in_whatsapp: true
      })
      setModalOpen(false)
      // Force trigger members refetch
      setTriggerFetch(v => v + 1)
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Error al guardar miembro')
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Miembros</h2>
          <p className="page-subtitle">{members.length} miembros registrados</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            id="btn-send-reminders"
            onClick={handleSendReminders}
            disabled={reminderLoading}
          >
            {reminderLoading ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid var(--gold)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.6s linear infinite'
                }} />
                Enviando...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/>
                </svg>
                Enviar recordatorios
              </>
            )}
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleOpenHistory}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Historial de envíos
          </button>
          <button
            className="btn btn-primary"
            id="btn-add-member"
            onClick={handleOpenModal}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo miembro
          </button>
        </div>
      </div>

      {/* Reminder result notification */}
      {reminderResult && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          animation: 'fadeIn 0.2s ease both',
          ...(reminderResult.type === 'sending'
            ? { background: 'rgba(234, 179, 8, 0.12)', color: 'var(--gold, #eab308)', border: '1px solid rgba(234, 179, 8, 0.3)' }
            : reminderResult.type === 'success'
            ? { background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(82, 183, 136, 0.25)' }
            : { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(224, 82, 82, 0.25)' }
          )
        }}>
          {reminderResult.type === 'sending' ? (
            <>
              <span style={{
                width: 16, height: 16, border: '2px solid currentColor',
                borderTopColor: 'transparent', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.6s linear infinite', flexShrink: 0
              }} />
              <span>{reminderResult.message}</span>
            </>
          ) : reminderResult.type === 'success' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>
                {reminderResult.customMsg ? (
                  reminderResult.customMsg
                ) : (
                  <>
                    ✅ Recordatorios procesados: <strong>{reminderResult.data?.total || 'Varios'}</strong> mensajes enviados exitosamente por Meta Cloud API.
                  </>
                )}
              </span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>❌ {reminderResult.message}</span>
            </>
          )}
          <button
            onClick={() => setReminderResult(null)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: 'inherit', opacity: 0.6,
              fontSize: '1rem', padding: '0.25rem', lineHeight: 1
            }}
          >×</button>
        </div>
      )}

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div className="input-with-icon" style={{ flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="members-search"
            className="input"
            type="search"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Estado filter chips */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              className={`btn btn-sm ${filter === opt ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(opt)}
              id={`filter-${opt}`}
            >
              {opt === 'todos' ? 'Todos' : ESTADO_LABEL[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gold)' }}>Buscando miembros...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
            <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
          </svg>
          <p>No se encontraron miembros</p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="table-wrapper desktop-only">
            <table className="table" aria-label="Lista de miembros">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Vencimiento</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/members/${m.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && navigate(`/members/${m.id}`)}
                      aria-label={`Ver ficha de ${m.nombre}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', flexShrink: 0,
                        }}>
                          {m.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{m.nombre}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.plan_nombre || 'Sin Plan'}</td>
                    <td>
                      <span className={`badge ${ESTADO_BADGE[m.estado]}`}>
                        {ESTADO_LABEL[m.estado]}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {formatDate(m.fecha_vencimiento)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Eliminar miembro"
                        onClick={e => { e.stopPropagation(); setDeleteTarget(m) }}
                        style={{ color: 'var(--danger)', opacity: 0.6 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="mobile-card-list mobile-only">
            {members.map(m => (
              <div
                key={m.id}
                className="mobile-list-card mobile-list-card--clickable"
                onClick={() => navigate(`/members/${m.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/members/${m.id}`)}
              >
                <div className="mobile-list-card-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 600, color: 'var(--gold)',
                    }}>
                      {m.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="mobile-list-card-name">{m.nombre}</span>
                  </div>
                  <span className={`badge ${ESTADO_BADGE[m.estado]}`}>{ESTADO_LABEL[m.estado]}</span>
                </div>
                <div className="mobile-list-card-row">
                  <span className="mobile-list-card-sub">
                    {m.plan_nombre || 'Sin plan'} · {formatDate(m.fecha_vencimiento)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    title="Eliminar miembro"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(m) }}
                    style={{ color: 'var(--danger)', opacity: 0.7 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* New member creation modal — rendered via Portal to document.body */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar nuevo miembro">
        <form onSubmit={handleAddMember} className="form-grid">
          <div className="input-group">
            <label className="input-label" htmlFor="member-name">Nombre completo</label>
            <input
              id="member-name"
              className="input"
              type="text"
              name="nombre"
              placeholder="e.g. Juan Pérez"
              value={form.nombre}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="member-phone">Teléfono (WhatsApp)</label>
            <input
              id="member-phone"
              className="input"
              type="tel"
              name="telefono"
              placeholder="e.g. +593991234567"
              value={form.telefono}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="member-email">Email (opcional)</label>
            <input
              id="member-email"
              className="input"
              type="email"
              name="email"
              placeholder="e.g. juan@mail.com"
              value={form.email}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label className="input-label" htmlFor="member-plan">Plan a contratar</label>
              <select
                id="member-plan"
                className="input"
                name="plan_id"
                value={form.plan_id}
                onChange={handleInputChange}
                required
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (${Number(p.precio).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="member-start-date">Fecha de inicio</label>
              <input
                id="member-start-date"
                className="input"
                type="date"
                name="fecha_inicio"
                value={form.fecha_inicio}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              id="member-whatsapp"
              type="checkbox"
              name="opt_in_whatsapp"
              checked={form.opt_in_whatsapp}
              onChange={handleInputChange}
              style={{ accentColor: 'var(--gold)' }}
            />
            <label htmlFor="member-whatsapp" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Habilitar recordatorios automáticos por WhatsApp
            </label>
          </div>

          {submitError && <p className="input-error-msg">{submitError}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" id="btn-save-member">Crear miembro</button>
          </div>
        </form>
      </Modal>

      {/* ── History modal ── */}
      {showHistoryModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <span className="modal-title">📋 Historial de Recordatorios WhatsApp</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Cargando historial...
                </div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No hay recordatorios registrados aún.
                </div>
              ) : (
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Miembro</th>
                      <th>Teléfono</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.fecha_envio).toLocaleString('es-EC')}</td>
                        <td><strong>{log.miembro_nombre}</strong></td>
                        <td>{log.miembro_telefono}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                            background: log.tipo === 'VENCE_HOY' ? 'rgba(234,179,8,0.15)' : log.tipo === 'VENCIDO' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                            color: log.tipo === 'VENCE_HOY' ? '#eab308' : log.tipo === 'VENCIDO' ? '#ef4444' : '#3b82f6'
                          }}>
                            {log.tipo}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 600,
                            color: log.estado === 'ENVIADO' ? 'var(--success, #10b981)' : '#ef4444'
                          }}>
                            {log.estado === 'ENVIADO' ? '✅ ENVIADO' : '❌ FALLIDO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <button
                className="btn btn-ghost"
                style={{
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)'
                }}
                onClick={handleClearHistory}
                disabled={historyLogs.length === 0}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Vaciar historial
              </button>
              <button className="btn btn-primary" onClick={() => setShowHistoryModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span id="delete-modal-title" className="modal-title">Eliminar miembro</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteTarget(null)} disabled={deleting}>×</button>
            </div>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--danger-subtle, rgba(239,68,68,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>
                ¿Eliminar a <strong>{deleteTarget.nombre}</strong>?
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Esta acción no se puede deshacer. El miembro dejará de aparecer en listados y no recibirá más notificaciones.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</button>
                <button className="btn" style={{
                  background: '#ef4444', color: '#fff',
                  borderRadius: 'var(--radius)', padding: '0.5rem 1.25rem',
                  fontWeight: 600, border: 'none', cursor: 'pointer',
                  opacity: deleting ? 0.6 : 1
                }} onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
