import { useEffect, useRef, useState, type FormEvent } from 'react'
import { chatApi, type ChatResponse } from '../../api/services'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate, taskDetailPath } from '../../app/router'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

type Message = { role: 'user' | 'assistant'; text: string; taskIds?: string[]; projectIds?: string[] }

export function ChatWidget() {
  const { workspace } = useDemoWorkspace()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages, pending, open])

  async function send(event: FormEvent) {
    event.preventDefault()
    const question = draft.trim()
    if (!question || pending) return
    const previousQuestions = messages.filter(item => item.role === 'user').slice(-5).map(item => item.text.slice(0, 1000))
    setMessages(current => [...current, { role: 'user', text: question }])
    setDraft(''); setError(''); setPending(true)
    try {
      const result: ChatResponse = await chatApi.send(question, projectId === 'all' ? null : Number(projectId), previousQuestions)
      setMessages(current => [...current, { role: 'assistant', text: result.answer, taskIds: result.relatedTaskIds, projectIds: result.relatedProjectIds }])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể kết nối trợ lý. Vui lòng thử lại.')
      setDraft(question)
      setMessages(current => current.slice(0, -1))
    } finally { setPending(false) }
  }

  function selectProject(value: string) { setProjectId(value); setMessages([]); setError('') }

  return <aside className="chat-widget" aria-label="Project help">
    {open && <section className="chat-widget__panel" role="dialog" aria-labelledby="chat-widget-title">
      <header className="chat-widget__header"><div><strong id="chat-widget-title">Project help</strong><span>Hỏi về dự án và công việc của bạn</span></div><button ref={closeRef} type="button" className="icon-button" aria-label="Close project help" onClick={() => { setOpen(false); triggerRef.current?.focus() }}><Icon name="close" /></button></header>
      <div className="chat-widget__scope"><label htmlFor="chat-project">Phạm vi dự án</label><select id="chat-project" value={projectId} disabled={pending} onChange={event => selectProject(event.target.value)}><option value="all">Tất cả dự án của tôi</option>{workspace.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className="chat-widget__messages" aria-live="polite" aria-relevant="additions text">
        {!messages.length && <p className="chat-widget__hint">Bạn có thể hỏi task nào nên làm trước, task đang bị chặn, hoặc nhờ tư vấn estimate và dependency.</p>}
        {messages.map((message, index) => <div key={index} className={`chat-widget__message chat-widget__message--${message.role}`}><strong>{message.role === 'user' ? 'Bạn' : 'Trợ lý'}</strong><p>{message.text}</p>{message.role === 'assistant' && <div className="chat-widget__links">{message.taskIds?.map(id => { const task = workspace.tasks.find(item => String(item.id) === id); return task && <button key={`task-${id}`} type="button" onClick={() => navigate(taskDetailPath(task.id, '/tasks'))}>{task.title}</button> })}{message.projectIds?.map(id => { const project = workspace.projects.find(item => String(item.id) === id); return project && <button key={`project-${id}`} type="button" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</button> })}</div>}</div>)}
        {pending && <p className="chat-widget__hint">Đang phân tích dữ liệu dự án…</p>}
        <div ref={endRef} />
      </div>
      {error && <p className="chat-widget__error" role="alert">{error}</p>}
      <form className="chat-widget__composer" onSubmit={send}><label className="sr-only" htmlFor="chat-message">Câu hỏi</label><input id="chat-message" type="text" maxLength={4000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Nhập câu hỏi…" disabled={pending} /><Button type="submit" disabled={pending || !draft.trim()} aria-label="Gửi câu hỏi"><Icon name="arrow" /></Button></form>
    </section>}
    <button ref={triggerRef} type="button" className="chat-widget__trigger" aria-label={open ? 'Close project help' : 'Open project help'} aria-expanded={open} onClick={() => setOpen(value => !value)}><Icon name={open ? 'close' : 'sparkles'} /><span>{open ? 'Close' : 'Help'}</span></button>
  </aside>
}
