import { useState, useEffect } from 'react'
import api from '../utils/api'
import Modal from '../components/ui/Modal'
import { formatDate } from '../utils/format'

const METODO_BADGE = {
  'Efectivo':      'badge-success',
  'Transferencia': 'badge-gold',
}

export default function Payments() {
  const [paymentsList, setPaymentsList] = useState([])
  const [loading, setLoading] = useState(true)

  // Register payment modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({
    member_id: '',
    monto: '',
    metodo: 'Efectivo',
    notas: ''
  })
  const [submitError, setSubmitError] = useState('')
  const [triggerFetch, setTriggerFetch] = useState(0)

  async function loadPayments() {
    try {
      const res = await api.get('/payments')
      setPaymentsList(res.data)
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [triggerFetch])

  // Fetch members list when opening the modal
  async function handleOpenModal() {
    setModalOpen(true)
    setSubmitError('')
    try {
      const res = await api.get('/members')
      setMembers(res.data)
      if (res.data.length > 0) {
        setForm(prev => ({ ...prev, member_id: res.data[0].id }))
      }
    } catch (err) {
      console.error('Error loading members:', err)
      setSubmitError('No se pudieron cargar los miembros para asociar el pago.')
    }
  }

  function handleInputChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleRegisterPayment(e) {
    e.preventDefault()
    setSubmitError('')

    try {
      await api.post('/payments', {
        ...form,
        member_id: Number(form.member_id),
        monto: Number(form.monto)
      })
      // Reset form
      setForm({
        member_id: members[0]?.id || '',
        monto: '',
        metodo: 'Efectivo',
        notes: ''
      })
      setModalOpen(false)
      // Force trigger refresh
      setLoading(true)
      setTriggerFetch(v => v + 1)
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Error al guardar el pago')
    }
  }

  const total = paymentsList.reduce((sum, p) => sum + Number(p.monto), 0)
  const totalCash = paymentsList
    .filter(p => p.metodo === 'Efectivo')
    .reduce((sum, p) => sum + Number(p.monto), 0)
  const totalBank = paymentsList
    .filter(p => p.metodo === 'Transferencia')
    .reduce((sum, p) => sum + Number(p.monto), 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pagos</h2>
          <p className="page-subtitle">Historial de pagos de miembros</p>
        </div>
        <button 
          className="btn btn-primary" 
          id="btn-register-payment"
          onClick={handleOpenModal}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Registrar pago
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total histórico</span>
          <span className="stat-value">${total.toLocaleString()}</span>
          <span className="stat-sub">{paymentsList.length} pagos registrados</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Efectivo</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>
            ${totalCash.toLocaleString()}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Transferencia</span>
          <span className="stat-value" style={{ color: 'var(--gold)' }}>
            ${totalBank.toLocaleString()}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gold)' }}>Cargando historial de caja...</p>
        </div>
      ) : paymentsList.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
            <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
          </svg>
          <p>No se encontraron registros de caja</p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="table-wrapper desktop-only">
            <table className="table" aria-label="Historial de pagos">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Plan</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.miembro_nombre}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.plan_nombre || 'Sin Plan'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      ${Number(p.monto).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${METODO_BADGE[p.metodo] ?? 'badge-muted'}`}>
                        {p.metodo}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {formatDate(p.fecha_pago)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="mobile-card-list mobile-only">
            {paymentsList.map(p => (
              <div key={p.id} className="mobile-list-card">
                <div className="mobile-list-card-row">
                  <span className="mobile-list-card-name">{p.miembro_nombre}</span>
                  <span className="mobile-list-card-amount">${Number(p.monto).toLocaleString()}</span>
                </div>
                <div className="mobile-list-card-row">
                  <span className="mobile-list-card-sub">{p.plan_nombre || 'Sin plan'} · {formatDate(p.fecha_pago)}</span>
                  <span className={`badge ${METODO_BADGE[p.metodo] ?? 'badge-muted'}`}>{p.metodo}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Register payment modal — rendered via Portal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar pago">
        <form onSubmit={handleRegisterPayment} className="form-grid">
          <div className="input-group">
            <label className="input-label" htmlFor="payment-member">Miembro</label>
            <select
              id="payment-member"
              className="input"
              name="member_id"
              value={form.member_id}
              onChange={handleInputChange}
              required
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.plan_nombre || 'Sin plan asignado'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label className="input-label" htmlFor="payment-amount">Monto ($)</label>
              <input
                id="payment-amount"
                className="input"
                type="number"
                name="monto"
                placeholder="e.g. 50"
                value={form.monto}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="payment-method">Método de pago</label>
              <select
                id="payment-method"
                className="input"
                name="metodo"
                value={form.metodo}
                onChange={handleInputChange}
                required
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="payment-notes">Notas (opcional)</label>
            <input
              id="payment-notes"
              className="input"
              type="text"
              name="notas"
              placeholder="e.g. Pago de membresía mensual"
              value={form.notas}
              onChange={handleInputChange}
            />
          </div>

          {submitError && <p className="input-error-msg">{submitError}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" id="btn-save-payment">Guardar pago</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
