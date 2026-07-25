/**
 * Genera los iconos PNG para la PWA a partir del SVG fuente.
 * Ejecutar: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '..', 'public')
const iconSvg = path.join(publicDir, 'icon.svg')

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
]

async function generate() {
  if (!fs.existsSync(iconSvg)) {
    console.error(`❌ No se encuentra ${iconSvg}`)
    process.exit(1)
  }

  console.log('📦 Generando iconos PWA...\n')

  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name)
    try {
      await sharp(iconSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath)
      const stats = fs.statSync(outputPath)
      const kb = (stats.size / 1024).toFixed(1)
      console.log(`  ✅ ${name} — ${size}x${size} — ${kb} KB`)
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`)
    }
  }

  console.log('\n🎉 ¡Iconos generados!')
}

generate()
