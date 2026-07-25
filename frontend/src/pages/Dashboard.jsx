import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

function StatusBadge({ estado }) {
  const map = {
    activo:     { cls: 'badge-success', label: 'Al día'      },
    por_vencer: { cls: 'badge-warning', label: 'Por vencer'  },
    vencido:    { cls: 'badge-danger',  label: 'Vencido'     },
  }
  const { cls, label } = map[estado] ?? { cls: 'badge-muted', label: estado }
  return <span className={`badge ${cls}`}>{label}</span>
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={accent ? { color: accent } : {}}>
        {value}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function loadStats() {
      try {
        const res = await api.get('/dashboard')
        if (active) {
          setData(res.data)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Error al conectar con la base de datos')
          setLoading(false)
        }
      }
    }
    loadStats()
    return () => { active = false }
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
        <p style={{ color: 'var(--gold)', fontWeight: 500 }}>Cargando métricas del gimnasio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{greeting()}, {user?.nombre?.split(' ')[0]} 👋</h2>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Miembros activos"
          value={data?.miembrosActivos || 0}
          sub="En tu gym"
        />
        <StatCard
          label="Clases"
          value={data?.clasesDehoy || 0}
          sub="En el sistema"
        />
        <StatCard
          label="Pagos pendientes"
          value={data?.pagosPendientes || 0}
          sub="Vencen pronto"
          accent="var(--warning)"
        />
        <StatCard
          label="Ingresos del mes"
          value={`$${(data?.ingresosMes || 0).toLocaleString()}`}
          sub="Registrados"
        />
      </div>

      {/* Two-column section */}
      <div className="dashboard-grid">

        {/* Clases del día */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Clases programadas</span>
            <span className="badge badge-gold">{(data?.clasesHoy || []).length} clases</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(data?.clasesHoy || []).length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay clases registradas hoy</p>
            ) : (
              data.clasesHoy.map(clase => (
                <div key={clase.id} className="clase-row">
                  <div className="clase-time">{clase.hora}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}>
                      {clase.nombre}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {clase.instructor}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <span style={{
                      color: clase.inscritos >= clase.capacidad ? 'var(--danger)' : 'var(--success)',
                      fontWeight: 600,
                    }}>
                      {clase.inscritos}
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>/{clase.capacidad}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagos próximos a vencer */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pagos por atender</span>
            <span className="badge badge-warning">{(data?.pagosProximos || []).length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(data?.pagosProximos || []).length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay deudas ni vencimientos pendientes</p>
            ) : (
              data.pagosProximos.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(p.vencimiento).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}><StatusBadge estado={p.estado} /></div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
