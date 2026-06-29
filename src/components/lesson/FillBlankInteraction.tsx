import { type FormEvent, useMemo, useState } from 'react'
import type { Feedback, FillBlankSlot } from '../../types/lesson'
import { MathText } from './MathText'
import { hashSeed, seededShuffle } from './shuffle'
import './Interactions.css'

type FillBlankInteractionProps = {
  template: string
  blanks: FillBlankSlot[]
  /** When provided, render a tap-to-place word bank instead of typed inputs. */
  bank?: (string | number)[]
  feedback?: Feedback
  doneNote?: string
  onComplete: () => void
}

type Segment = { kind: 'text'; text: string } | { kind: 'blank'; slot: FillBlankSlot }

// Split a template like "Sum = ({{n}} − 2) × {{base}}°" into alternating text
// and blank segments. Tokens with no matching slot are left as literal text so a
// typo can never silently swallow content.
function parseTemplate(template: string, blanks: FillBlankSlot[]): Segment[] {
  const byId = new Map(blanks.map((slot) => [slot.id, slot]))
  const segments: Segment[] = []
  const pattern = /\{\{(\w+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: template.slice(lastIndex, match.index) })
    }
    const slot = byId.get(match[1])
    if (slot) {
      segments.push({ kind: 'blank', slot })
    } else {
      segments.push({ kind: 'text', text: match[0] })
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < template.length) {
    segments.push({ kind: 'text', text: template.slice(lastIndex) })
  }
  return segments
}

function isCorrect(slot: FillBlankSlot, raw: string): boolean {
  const entry = raw.trim()
  if (entry === '') {
    return false
  }
  if (typeof slot.answer === 'number') {
    const parsed = Number.parseFloat(entry)
    return Number.isFinite(parsed) && Math.abs(parsed - slot.answer) <= (slot.tolerance ?? 0)
  }
  const accepted = [slot.answer, ...(slot.accept ?? [])].map((value) => value.toLowerCase())
  return accepted.includes(entry.toLowerCase())
}

// Cloze / fill-in-the-blanks. Two modes: a tap-to-place word bank (when `bank`
// is given) or free-text inputs. Either way every answer is graded in code
// (numeric with tolerance, or case-insensitive text match).
export function FillBlankInteraction(props: FillBlankInteractionProps) {
  if (props.bank && props.bank.length > 0) {
    return <WordBankFill {...props} bank={props.bank} />
  }
  return <TypedFill {...props} />
}

function TypedFill({ template, blanks, feedback, doneNote, onComplete }: FillBlankInteractionProps) {
  const segments = useMemo(() => parseTemplate(template, blanks), [template, blanks])
  const [values, setValues] = useState<Record<string, string>>({})
  const [solved, setSolved] = useState(false)
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()

  const allFilled = blanks.every((slot) => (values[slot.id] ?? '').trim() !== '')

  function check(event: FormEvent) {
    event.preventDefault()
    const allRight = blanks.every((slot) => isCorrect(slot, values[slot.id] ?? ''))
    if (allRight) {
      setSolved(true)
      setStatus({ correct: true, text: doneNote ?? feedback?.correct ?? 'That’s it.' })
      onComplete()
      return
    }
    setStatus({
      correct: false,
      text: feedback?.incorrect ?? 'Not all of those are right yet — check each blank.',
    })
  }

  return (
    <form className="fill-blank" onSubmit={check}>
      <p className="fill-blank__template">
        {segments.map((segment, index) => {
          if (segment.kind === 'text') {
            return (
              <span key={index} className="fill-blank__text">
                <MathText text={segment.text} />
              </span>
            )
          }
          const slot = segment.slot
          const value = values[slot.id] ?? ''
          const wrong = status?.correct === false && value.trim() !== '' && !isCorrect(slot, value)
          return (
            <span key={index} className="fill-blank__slot">
              <input
                className={
                  solved
                    ? 'fill-blank__input is-correct'
                    : wrong
                      ? 'fill-blank__input is-wrong'
                      : 'fill-blank__input'
                }
                inputMode={typeof slot.answer === 'number' ? 'numeric' : 'text'}
                autoComplete="off"
                aria-label={`Blank ${slot.id}`}
                size={Math.max(String(slot.answer).length + 1, (slot.placeholder ?? '').length, 4)}
                placeholder={slot.placeholder ?? ''}
                value={value}
                disabled={solved}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [slot.id]: event.target.value }))
                  if (status && !status.correct) {
                    setStatus(undefined)
                  }
                }}
              />
              {slot.unit && <span className="fill-blank__unit">{slot.unit}</span>}
            </span>
          )
        })}
      </p>

      {!solved && (
        <button type="submit" className="btn btn--primary fill-blank__check" disabled={!allFilled}>
          Check
        </button>
      )}

      {status && (
        <div className={status.correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
          <strong>{status.correct ? 'Correct' : 'Not quite'}</strong>
          <p>
            <MathText text={status.text} />
          </p>
        </div>
      )}
    </form>
  )
}

type Chip = { id: number; label: string; value: string | number }

// Tap-to-place word bank: tap a chip to drop it into the next empty blank; tap a
// filled blank to send its chip back to the bank. Chips are matched to each
// blank's answer in code, so distractors in the bank are simply never accepted.
function WordBankFill({
  template,
  blanks,
  bank,
  feedback,
  doneNote,
  onComplete,
}: FillBlankInteractionProps & { bank: (string | number)[] }) {
  const segments = useMemo(() => parseTemplate(template, blanks), [template, blanks])
  const orderedSlots = useMemo(
    () => segments.flatMap((segment) => (segment.kind === 'blank' ? [segment.slot] : [])),
    [segments],
  )
  // Stable, shuffled chip order (seeded from the bank + template so it never
  // echoes the answer order yet stays put across re-renders).
  const chips = useMemo<Chip[]>(() => {
    const base = bank.map((value, index) => ({ id: index, label: String(value), value }))
    return seededShuffle(base, hashSeed(template + '|' + bank.join('|')))
  }, [bank, template])

  // blank id -> chip id placed there
  const [placed, setPlaced] = useState<Record<string, number>>({})
  const [solved, setSolved] = useState(false)
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()

  const usedChipIds = new Set(Object.values(placed))
  const allFilled = orderedSlots.every((slot) => placed[slot.id] !== undefined)
  const chipById = new Map(chips.map((chip) => [chip.id, chip]))

  function placeChip(chipId: number) {
    if (solved || usedChipIds.has(chipId)) {
      return
    }
    const target = orderedSlots.find((slot) => placed[slot.id] === undefined)
    if (!target) {
      return
    }
    setPlaced((current) => ({ ...current, [target.id]: chipId }))
    if (status) {
      setStatus(undefined)
    }
  }

  function clearBlank(slotId: string) {
    if (solved || placed[slotId] === undefined) {
      return
    }
    setPlaced((current) => {
      const next = { ...current }
      delete next[slotId]
      return next
    })
    if (status) {
      setStatus(undefined)
    }
  }

  function slotIsRight(slot: FillBlankSlot): boolean {
    const chipId = placed[slot.id]
    if (chipId === undefined) {
      return false
    }
    return isCorrect(slot, String(chipById.get(chipId)?.value ?? ''))
  }

  function check() {
    if (orderedSlots.every(slotIsRight)) {
      setSolved(true)
      setStatus({ correct: true, text: doneNote ?? feedback?.correct ?? 'That’s it.' })
      onComplete()
      return
    }
    setStatus({
      correct: false,
      text: feedback?.incorrect ?? 'Not quite — tap a placed word to send it back, then try another.',
    })
  }

  return (
    <section className="fill-blank wbank" aria-label="Fill the blanks from the word bank">
      <p className="fill-blank__template">
        {segments.map((segment, index) => {
          if (segment.kind === 'text') {
            return (
              <span key={index} className="fill-blank__text">
                <MathText text={segment.text} />
              </span>
            )
          }
          const slot = segment.slot
          const chipId = placed[slot.id]
          const filled = chipId !== undefined
          const wrong = status?.correct === false && filled && !slotIsRight(slot)
          const cls = [
            'wbank__slot',
            filled && 'is-filled',
            solved && filled && 'is-correct',
            wrong && 'is-wrong',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <span key={index} className="fill-blank__slot">
              <button
                type="button"
                className={cls}
                disabled={solved}
                aria-label={filled ? `Blank: ${chipById.get(chipId)?.label}. Tap to remove.` : 'Empty blank'}
                onClick={() => clearBlank(slot.id)}
              >
                {filled ? chipById.get(chipId)?.label : ' '}
              </button>
              {slot.unit && <span className="fill-blank__unit">{slot.unit}</span>}
            </span>
          )
        })}
      </p>

      {!solved && (
        <div className="wbank__bank" role="group" aria-label="Word bank">
          {chips.map((chip) => {
            const used = usedChipIds.has(chip.id)
            return (
              <button
                key={chip.id}
                type="button"
                className={used ? 'wbank__chip is-used' : 'wbank__chip'}
                disabled={used}
                onClick={() => placeChip(chip.id)}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}

      {!solved && (
        <button
          type="button"
          className="btn btn--primary fill-blank__check"
          disabled={!allFilled}
          onClick={check}
        >
          Check
        </button>
      )}

      {status && (
        <div className={status.correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
          <strong>{status.correct ? 'Correct' : 'Not quite'}</strong>
          <p>
            <MathText text={status.text} />
          </p>
        </div>
      )}
    </section>
  )
}
