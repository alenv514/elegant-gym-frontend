import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Modal from '../components/ui/Modal'

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
        <div className="table-wrapper">
          <table className="table" aria-label="Lista de miembros">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="col-hide-mobile">Plan</th>
                <th>Estado</th>
                <th className="col-hide-mobile">Vencimiento</th>
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
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'var(--gold-subtle)',
                        border: '1px solid var(--gold-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--gold)',
                        flexShrink: 0,
                      }}>
                        {m.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{m.nombre}</span>
                    </div>
                  </td>
                  <td className="col-hide-mobile" style={{ color: 'var(--text-muted)' }}>{m.plan_nombre || 'Sin Plan'}</td>
                  <td>
                    <span className={`badge ${ESTADO_BADGE[m.estado]}`}>
                      {ESTADO_LABEL[m.estado]}
                    </span>
                  </td>
                  <td className="col-hide-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {new Date(m.fecha_vencimiento).toLocaleDateString('es-MX')}
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
