import { useEffect, useState, type FormEvent } from 'react'
import { usersApi } from '../../api/services'
import type { MemberSkill } from '../../api/models'
import { Button } from '../../components/ui/Button'

const levels = [
  { value: 'beginner', label: 'Cơ bản' }, { value: 'intermediate', label: 'Trung cấp' },
  { value: 'advanced', label: 'Nâng cao' }, { value: 'expert', label: 'Chuyên gia' },
]
const signature = (skills: MemberSkill[]) => JSON.stringify(skills.map(s => [s.skillId, s.level]).sort((a, b) => Number(a[0]) - Number(b[0])))

export function MySkills() {
  const [catalog, setCatalog] = useState<Array<{ id: number; name: string; category: string | null }>>([])
  const [saved, setSaved] = useState<MemberSkill[]>([])
  const [draft, setDraft] = useState<MemberSkill[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let live = true
    setLoading(true); setError('')
    Promise.all([usersApi.skillCatalog(), usersApi.mySkills()]).then(([all, mine]) => {
      if (live) { setCatalog(all); setSaved(mine); setDraft(mine); setSelected('') }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được kỹ năng.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [revision])
  const dirty = signature(draft) !== signature(saved)
  const available = catalog.filter(skill => !draft.some(entry => entry.skillId === skill.id))
  function add() {
    const skill = available.find(value => value.id === Number(selected))
    if (!skill || draft.length >= 100) return
    setDraft(value => [...value, { skillId: skill.id, name: skill.name, category: skill.category, level: 'intermediate' }])
    setSelected(''); setNotice(''); setError('')
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!dirty || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await usersApi.saveMySkills(draft.map(({ skillId, level }) => ({ skillId, level })))
      setSaved(result); setDraft(result); setNotice('Đã lưu kỹ năng của bạn.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được kỹ năng. Thay đổi của bạn vẫn được giữ để thử lại.') }
    finally { setBusy(false) }
  }
  return <section className="content-panel my-skills" aria-labelledby="my-skills-heading" aria-busy={loading || busy}>
    <div><h2 id="my-skills-heading">Kỹ năng của tôi</h2><p>Khai báo kỹ năng và trình độ hiện tại để hỗ trợ đề xuất phân công công việc. Thay đổi chỉ áp dụng cho hồ sơ của bạn.</p></div>
    {error && <div role="alert"><p>{error}</p>{loading === false && catalog.length === 0 && <Button onClick={() => setRevision(value => value + 1)}>Thử tải lại</Button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Đang tải kỹ năng…</p> : <form onSubmit={event => void save(event)}>
      <fieldset disabled={busy}>
        <legend className="sr-only">Chỉnh sửa kỹ năng cá nhân</legend>
        <div className="my-skills-add"><label htmlFor="profile-skill-picker">Chọn kỹ năng</label>
          <select id="profile-skill-picker" value={selected} onChange={event => setSelected(event.target.value)} disabled={!available.length || draft.length >= 100}>
            <option value="">Chọn từ danh mục</option>{available.map(skill => <option key={skill.id} value={skill.id}>{skill.name}{skill.category ? ` · ${skill.category}` : ''}</option>)}
          </select><Button disabled={!selected || draft.length >= 100} onClick={add}>Thêm kỹ năng</Button>
        </div>
        {!catalog.length && <p>Danh mục kỹ năng hiện chưa có dữ liệu. Liên hệ quản trị viên để bổ sung.</p>}
        {!draft.length && <p>Bạn chưa chọn kỹ năng nào. Các thay đổi chỉ được áp dụng khi bấm Lưu kỹ năng.</p>}
        <ul className="my-skills-list">{draft.map(skill => <li key={skill.skillId}>
          <div><strong>{skill.name}</strong><small>{skill.category || 'Chưa phân loại'}</small></div>
          <label htmlFor={`profile-skill-level-${skill.skillId}`}>Trình độ {skill.name}</label>
          <select id={`profile-skill-level-${skill.skillId}`} value={skill.level} onChange={event => { setDraft(value => value.map(s => s.skillId === skill.skillId ? { ...s, level: event.target.value } : s)); setNotice('') }}>
            {!levels.some(level => level.value === skill.level) && <option value={skill.level}>Cần chọn trình độ</option>}
            {levels.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
          </select>
          <Button variant="ghost" aria-label={`Xóa kỹ năng ${skill.name}`} onClick={() => { setDraft(value => value.filter(s => s.skillId !== skill.skillId)); setNotice('') }}>Xóa</Button>
        </li>)}</ul>
        {dirty && <p role="status">Có thay đổi chưa lưu.</p>}
        <div className="dialog__actions"><Button disabled={!dirty} onClick={() => { setDraft(saved); setSelected(''); setError(''); setNotice('') }}>Hủy thay đổi</Button><Button type="submit" variant="primary" disabled={!dirty || draft.some(s => !levels.some(level => level.value === s.level))}>{busy ? 'Đang lưu…' : 'Lưu kỹ năng'}</Button></div>
      </fieldset>
    </form>}
  </section>
}
