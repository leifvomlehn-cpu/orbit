import { useAppDispatch, useAppState } from '../state/AppContext'

/** Hilfe-Modal (Inhalte 1:1 aus dem alten Frontend übernommen). */
export default function HelpModal() {
  const dispatch = useAppDispatch()
  const open = useAppState().helpOpen
  const close = () => dispatch({ type: 'help/set', open: false })

  return (
    <div
      id="help-modal"
      className={open ? 'modal' : 'modal hidden'}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>📖 Hilfe &amp; Bedienung</h2>
          <button className="modal-close close-btn" aria-label="Schließen" onClick={close}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <section>
            <h3>🖱️ Maus &amp; Touch</h3>
            <ul>
              <li>
                <strong>Klick:</strong> Himmelskörper auswählen
              </li>
              <li>
                <strong>Ziehen:</strong> Ansicht verschieben (3D: drehen)
              </li>
              <li>
                <strong>Mausrad / Pinch:</strong> Zoomen
              </li>
            </ul>
          </section>
          <section>
            <h3>⌨️ Tastenkürzel</h3>
            <ul>
              <li>
                <strong>Leertaste:</strong> Animation starten/pausieren
              </li>
              <li>
                <strong>Pfeiltasten:</strong> Zeit vor/zurück
              </li>
              <li>
                <strong>+/-:</strong> Zoomen
              </li>
              <li>
                <strong>R:</strong> Ansicht zurücksetzen
              </li>
              <li>
                <strong>ESC:</strong> Panels schließen
              </li>
            </ul>
          </section>
          <section>
            <h3>📱 iPad &amp; Mobile</h3>
            <p>
              Alle Bedienelemente sind für Touch optimiert (min. 44x44px). Die Menüs blenden sich
              automatisch nach 5 Sekunden Inaktivität aus, um die volle Sicht auf das Sonnensystem
              zu geben.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
