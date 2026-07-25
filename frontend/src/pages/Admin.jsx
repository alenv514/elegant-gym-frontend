import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function Admin() {
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  async function loadGyms() {
    try {
      const res = await api.get('/admin/gyms')
      setGyms(res.data)
    } catch (err) {
      console.error('Error fetching admin gyms:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGyms()
  }, [])

  async function handleRecordPayment(gymId) {
    setActionLoadingId(gymId)
    try {
      await api.post(`/admin/gyms/${gymId}/payment`, {
        monto: 599.00 // base subscription rate
      })
      // Reload gyms list to show updated active and expiration date states immediately
      await loadGyms()
    } catch (err) {
      console.error('Error recording gym payment:', err)
      alert(err.response?.data?.error || 'Error al registrar pago')
    } finally {
      setActionLoadingId(null)
    }
  }

  const activeCount = gyms.filter(g => g.suscripcion_activa).length
  const suspendedCount = gyms.filter(g => !g.suscripcion_activa).length
  const mrr = activeCount * 599.00

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Panel de Administración</h2>
          <p className="page-subtitle">Gestión de gyms suscritos al SaaS</p>
        </div>
        <button className="btn btn-primary" id="btn-add-gym">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Agregar gym
        </button>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Gyms totales</span>
          <span className="stat-value">{gyms.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Activos</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>
            {activeCount}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Suspendidos</span>
          <span className="stat-value" style={{ color: 'var(--danger)' }}>
            {suspendedCount}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">MRR</span>
          <span className="stat-value">
            ${mrr.toLocaleString()}
          </span>
          <span className="stat-sub">Ingresos mensuales</span>
        </div>
      </div>

      {/* Gyms table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gold)' }}>Cargando lista de gimnasios...</p>
        </div>
      ) : gyms.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p>No se encontraron gimnasios registrados</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" aria-label="Lista de gyms">
            <thead>
              <tr>
                <th>Gym</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Último pago</th>
                <th>Vence</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {gyms.map(gym => (
                <tr key={gym.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{gym.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{gym.email_contacto}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{gym.ciudad || '—'}</td>
                  <td>
                    <span className={`badge ${gym.suscripcion_activa ? 'badge-success' : 'badge-danger'}`}>
                      {gym.suscripcion_activa ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {gym.fecha_ultimo_pago ? new Date(gym.fecha_ultimo_pago).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: gym.suscripcion_activa ? 'var(--text-muted)' : 'var(--danger)', fontWeight: gym.suscripcion_activa ? 400 : 600 }}>
                      {new Date(gym.fecha_vencimiento).toLocaleDateString('es-MX')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      id={`btn-mark-paid-${gym.id}`}
                      onClick={() => handleRecordPayment(gym.id)}
                      disabled={actionLoadingId === gym.id}
                      title="Marcar pago recibido para este mes"
                    >
                      {actionLoadingId === gym.id ? 'Registrando...' : '✓ Pago recibido'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
