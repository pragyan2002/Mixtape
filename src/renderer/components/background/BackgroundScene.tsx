import { BlissLayer } from './BlissLayer'
import { SpriteField } from './SpriteField'

// Mounted once at the App root, behind <main> and <NavBar>.
export function BackgroundScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <BlissLayer />
      <SpriteField />
    </div>
  )
}
