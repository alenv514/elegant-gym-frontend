import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Modal from '../components/ui/Modal'
import { formatDate } from '../utils/format'

// ─── IMC utility — single source of truth ────────────────
function calcIMC(peso, altura) {
  if (!peso || !altura || altura === 0) return null
  return +(peso / (altura * altura)).toFixed(1)
}

function imcCategory(imc) {
  if (!imc) return null
  if (imc < 18.5) return { label: 'Bajo peso',     cls: 'badge-warning' }
  if (imc < 25)   return { label: 'Normal',         cls: 'badge-success' }
  if (imc < 30)   return { label: 'Sobrepeso',      cls: 'badge-warning' }
  return             { label: 'Obesidad',        cls: 'badge-danger'  }
}

const ESTADO_BADGE = {
  activo:     'badge-success',
  por_vencer: 'badge-warning',
  vencido:    'badge-danger',
}
const ESTADO_LABEL = {
  activo: 'Al día', por_vencer: 'Por vencer', vencido: 'Vencido',
}

export default function MemberDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Biometrics modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [submitError, setSubmitError] = useState('')

  // Edit member modal
  const [editOpen, setEditOpen] = useState(false)
  const [plans, setPlans] = useState([])
  const [editForm, setEditForm] = useState({ nombre: '', email: '', telefono: '', plan_id: '' })
  const [editError, setEditError] = useState('')

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function loadMember() {
    try {
      const res = await api.get(`/members/${id}`)
      setMember(res.data)
      setHeight(res.data.altura || '')
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar detalles del miembro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMember()
  }, [id])

  // ── Open edit form ──
  async function openEditForm() {
    try {
      const plansRes = await api.get('/plans')
      setPlans(plansRes.data)
    } catch {}
    setEditForm({
      nombre: member.nombre,
      email: member.email || '',
      telefono: member.telefono,
      plan_id: member.plan_id || ''
    })
    setEditError('')
    setEditOpen(true)
  }

  // ── Delete ──
  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/members/${id}`)
      navigate('/members', { replace: true })
    } catch (err) {
      console.error('Error deleting member:', err)
      alert(err.response?.data?.error || 'Error al eliminar miembro')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // ── Save edit ──
  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditError('')
    try {
      await api.put(`/members/${id}`, {
        nombre: editForm.nombre,
        email: editForm.email || null,
        telefono: editForm.telefono,
        plan_id: Number(editForm.plan_id)
      })
      setEditOpen(false)
      setLoading(true)
      loadMember()
    } catch (err) {
      setEditError(err.response?.data?.error || 'Error al guardar cambios')
    }
  }

  async function handleAddMetric(e) {
    e.preventDefault()
    setSubmitError('')
    try {
      await api.post(`/members/${id}/metrics`, {
        peso_kg: Number(weight),
        altura_m: Number(height)
      })
      setWeight('')
      setModalOpen(false)
      // Reload stats to show changes in lists instantly
      setLoading(true)
      loadMember()
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Error al registrar métricas')
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
        <p style={{ color: 'var(--gold)' }}>Cargando ficha del socio...</p>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>{error || 'Socio no encontrado'}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/members')}>
            Volver
          </button>
        </div>
      </div>
    )
  }

  const imc      = calcIMC(member.peso, member.altura)
  const imcCat   = imcCategory(imc)
  const initials = member.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="page">
      {/* Back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/members')}
        style={{ marginBottom: '1.25rem' }}
        id="btn-back-members"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Miembros
      </button>

      {/* Profile header */}
      <div className="member-profile-header card">
        <div className="member-profile-avatar">
          {initials}
        </div>
        <div className="member-profile-info">
          <h2 className="member-profile-name">
            {member.nombre}
          </h2>
          <div className="member-profile-badges">
            <span className={`badge ${ESTADO_BADGE[member.estado]}`}>{ESTADO_LABEL[member.estado]}</span>
            <span className="badge badge-gold">{member.plan_nombre || 'Sin Plan'}</span>
            <span className="member-profile-expiry">
              Vence: {formatDate(member.fecha_vencimiento)}
            </span>
          </div>
        </div>
        <div className="member-profile-actions">
          {member.telefono && (
            <a
              href={`https://wa.me/${member.telefono.replace(/\D/g, '').replace(/^0/, '593')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              id="btn-whatsapp-member"
              title={`Abrir WhatsApp de ${member.nombre}`}
              style={{ color: 'var(--gold)', border: '1px solid var(--gold-border)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12.05 2C6.496 2 2.013 6.48 2.013 12.029c0 1.867.487 3.63 1.337 5.162L2 22l4.946-1.302a10.04 10.04 0 0 0 5.104 1.386h.004C17.608 22.084 22 17.6 22 12.05 22 6.498 17.608 2.002 12.05 2zm0 18.344a8.32 8.32 0 0 1-4.251-1.163l-.305-.18-3.153.829.842-3.074-.199-.317A8.297 8.297 0 0 1 3.723 12.05c0-4.593 3.739-8.328 8.327-8.328 4.592 0 8.33 3.735 8.33 8.328 0 4.595-3.738 8.294-8.33 8.294z"/>
              </svg>
              WhatsApp
            </a>
          )}
          <button className="btn btn-ghost btn-sm" id="btn-edit-member" onClick={() => openEditForm()}>Editar</button>
          <button
            className="btn btn-ghost btn-sm"
            id="btn-delete-member"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ color: 'var(--danger)', opacity: 0.6 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            title="Eliminar miembro"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span className="btn-text">Eliminar</span>
          </button>
        </div>
      </div>

      <div className="dashboard-grid">

        {/* Datos de contacto */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Contacto</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <InfoRow label="Email"    value={member.email || 'No registrado'} />
            <InfoRow label="Teléfono" value={member.telefono} />
            <InfoRow label="Plan"     value={member.plan_nombre || 'Sin Plan'} />
          </div>
        </div>

        {/* IMC */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Métricas corporales</span>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => setModalOpen(true)}
              id="btn-add-metric"
            >
              + Registrar
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="stat-card" style={{ padding: '0.875rem' }}>
              <span className="stat-label">Peso</span>
              <span className="stat-value" style={{ fontSize: '1.5rem' }}>{member.peso || '—'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>kg</span></span>
            </div>
            <div className="stat-card" style={{ padding: '0.875rem' }}>
              <span className="stat-label">Altura</span>
              <span className="stat-value" style={{ fontSize: '1.5rem' }}>{member.altura || '—'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>m</span></span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <div className="stat-label">IMC</div>
              <div className="stat-value" style={{ fontSize: '1.75rem' }}>{imc || '—'}</div>
            </div>
            {imcCat && <span className={`badge ${imcCat.cls}`}>{imcCat.label}</span>}
          </div>
        </div>

        {/* Clase del día */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Clase de hoy</span>
          </div>
          <div style={{
            background: 'var(--gold-subtle)',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            color: 'var(--gold)',
            fontWeight: 500,
            fontSize: '0.9375rem',
          }}>
            {member.claseHoy}
          </div>
        </div>

        {/* Historial IMC */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Historial de peso</span>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            {member.historial.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '1rem 0' }}>No hay métricas registradas todavía</p>
            ) : (
              <table className="table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Peso</th>
                    <th>IMC</th>
                  </tr>
                </thead>
                <tbody>
                  {member.historial.map((h, i) => {
                    const hImc = calcIMC(h.peso, h.altura)
                    const hCat = imcCategory(hImc)
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {formatDate(h.fecha)}
                        </td>
                        <td>{h.peso} kg</td>
                        <td>
                          {hImc}
                          {hCat && (
                            <span className={`badge ${hCat.cls}`} style={{ marginLeft: '0.5rem' }}>
                              {hCat.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ── Edit member modal ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar miembro">
        <form onSubmit={handleSaveEdit} className="form-grid">
          <div className="input-group">
            <label className="input-label" htmlFor="edit-name">Nombre completo</label>
            <input id="edit-name" className="input" type="text"
              value={editForm.nombre}
              onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="edit-phone">Teléfono</label>
            <input id="edit-phone" className="input" type="tel"
              value={editForm.telefono}
              onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="edit-email">Email</label>
            <input id="edit-email" className="input" type="email"
              value={editForm.email}
              onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="edit-plan">Plan</label>
            <select id="edit-plan" className="input"
              value={editForm.plan_id}
              onChange={e => setEditForm(p => ({ ...p, plan_id: e.target.value }))}
              required
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} (${Number(p.precio).toFixed(0)})</option>
              ))}
            </select>
          </div>
          {editError && <p className="input-error-msg">{editError}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar cambios</button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation ── */}
      {showDeleteConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span id="delete-modal-title" className="modal-title">Eliminar miembro</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>×</button>
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
                ¿Eliminar a <strong>{member.nombre}</strong>?
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Esta acción no se puede deshacer. El miembro dejará de aparecer en listados y no recibirá más notificaciones.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancelar</button>
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

      {/* Add metrics modal */}
      {modalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal">
            <div className="modal-header">
              <span id="modal-title" className="modal-title">Registrar métricas</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddMetric} className="form-grid">
              <div className="input-group">
                <label className="input-label" htmlFor="weight-input">Peso (kg)</label>
                <input
                  id="weight-input"
                  className="input"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 72.5"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="height-input">Altura (m)</label>
                <input
                  id="height-input"
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1.75"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  required
                />
              </div>
              {submitError && <p className="input-error-msg">{submitError}</p>}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" id="btn-save-metrics">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '0.75rem', minWidth: 0 }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={value}>
        {value}
      </span>
    </div>
  )
}
