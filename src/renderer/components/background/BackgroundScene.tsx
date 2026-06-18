import { BlissLayer } from './BlissLayer'
import { SpriteField } from './SpriteField'
import blissBg from '../../../../assets/bliss-pixel-240x150.png'

// Mounted once at the App root, behind <main> and <NavBar>.
export function BackgroundScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <BlissLayer src={blissBg} />
      <SpriteField />
    </div>
  )
}
