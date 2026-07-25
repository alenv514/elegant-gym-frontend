import { useState, useEffect } from 'react'

/**
 * Hook personalizado para manejar la instalación PWA.
 * 
 * - En Chrome/Android: escucha el evento `beforeinstallprompt` y lo almacena.
 * - En iOS/Safari: muestra un tooltip si el usuario está en modo safari y no está standalone.
 * 
 * Devuelve:
 *   - canInstall: boolean — si el evento beforeinstallprompt está disponible
 *   - isIOS: boolean — si está en iOS (para mostrar instrucciones)
 *   - isStandalone: boolean — si ya está instalada (display-mode: standalone)
 *   - isInstalled: boolean — si ya está instalada (cualquier método)
 *   - install: function — dispara el prompt de instalación
 */
export default function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada (standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mediaQuery.matches)
    const handler = (e) => setIsStandalone(e.matches)
    mediaQuery.addEventListener('change', handler)

    // Detectar iOS
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(iOS)

    // Escuchar evento beforeinstallprompt (Chrome/Android)
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Detectar instalación exitosa
    const onInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      mediaQuery.removeEventListener('change', handler)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  /** Dispara el prompt de instalación */
  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  return {
    canInstall: !!deferredPrompt,
    isIOS,
    isStandalone,
    isInstalled: isStandalone,
    install,
  }
}
