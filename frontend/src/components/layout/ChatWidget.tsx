import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return <aside className="chat-widget" aria-label="Project help">
    {open && <section className="chat-widget__panel" role="dialog" aria-labelledby="chat-widget-title" aria-describedby="chat-widget-status">
      <header className="chat-widget__header"><div><strong id="chat-widget-title">Project help</strong><span>Assistant unavailable</span></div><button ref={closeRef} type="button" className="icon-button" aria-label="Close project help" onClick={() => { setOpen(false); triggerRef.current?.focus() }}><Icon name="close" /></button></header>
      <div className="chat-widget__body"><span className="chat-widget__icon"><Icon name="sparkles" /></span><p id="chat-widget-status"><strong>Chat is not connected.</strong> No assistant service is configured, so messages cannot be sent or answered.</p></div>
      <div className="chat-widget__composer"><label className="sr-only" htmlFor="chat-message">Message</label><input id="chat-message" type="text" placeholder="Chat is unavailable" disabled /><Button disabled aria-label="Send message"><Icon name="arrow" /></Button></div>
    </section>}
    <button ref={triggerRef} type="button" className="chat-widget__trigger" aria-label={open ? 'Close project help' : 'Open project help'} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Icon name={open ? 'close' : 'sparkles'} /><span>{open ? 'Close' : 'Help'}</span></button>
  </aside>
}
