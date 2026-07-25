// ─── Mock data — remove when backend is connected ────────
export const MOCK_STATS = {
  miembrosActivos: 47,
  clasesDehoy: 3,
  pagosPendientes: 8,
  ingresosMes: 4200,
}

export const MOCK_CLASES_HOY = [
  { id: 1, nombre: 'CrossFit Matutino',  hora: '07:00', inscritos: 12, capacidad: 15, instructor: 'Roberto Silva' },
  { id: 2, nombre: 'Yoga & Stretching',  hora: '10:00', inscritos: 8,  capacidad: 10, instructor: 'María López'  },
  { id: 3, nombre: 'Funcional Nocturno', hora: '19:00', inscritos: 14, capacidad: 15, instructor: 'Luis Herrera' },
]

export const MOCK_PAGOS_PROXIMOS = [
  { id: 1, nombre: 'Ana Martínez',  vencimiento: '2026-07-25', estado: 'por_vencer' },
  { id: 2, nombre: 'Pedro Ruiz',    vencimiento: '2026-07-23', estado: 'vencido'    },
  { id: 3, nombre: 'Laura Castro',  vencimiento: '2026-07-26', estado: 'por_vencer' },
]
