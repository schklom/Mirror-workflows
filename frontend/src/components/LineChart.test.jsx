// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LineChart from './LineChart.jsx'
import { fmtDate, isoOf } from '../lib/format.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const point = (year, month, day, y) => ({
  d: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  t: new Date(year, month - 1, day, 12).getTime(),
  y
})

function renderChart(points) {
  act(() => root.render(<LineChart points={points} axes={false} unit="kg" />))
}

function hoverAt(clientX) {
  act(() => {
    container.querySelector('.chart-i').dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX }))
  })
  return container.querySelector('.ctip').textContent
}

describe('LineChart hover date', () => {
  it('keeps same-year points in the compact format', () => {
    const first = point(2026, 1, 15, 70)
    renderChart([first, point(2026, 2, 15, 71)])

    expect(hoverAt(0)).toBe(`${fmtDate(first.d, true)} · 70 kg`)
  })

  it('includes the calendar year at a short cross-year boundary', () => {
    const first = point(2025, 11, 30, 70)
    const last = point(2026, 2, 1, 71)
    renderChart([first, last])

    expect(hoverAt(0)).toBe(`${fmtDate(first.d, true, true)} · 70 kg`)
    expect(hoverAt(340)).toBe(`${fmtDate(last.d, true, true)} · 71 kg`)
  })

  it('keeps a single point compact', () => {
    const only = point(2026, 7, 4, 70)
    renderChart([only])

    expect(hoverAt(170)).toBe(`${fmtDate(only.d, true)} · 70 kg`)
  })

  it('uses timestamp-only points when deciding whether to show the year', () => {
    const first = point(2025, 12, 31, 70)
    const last = point(2026, 1, 1, 71)
    const timestampOnly = [{ t: first.t, y: first.y }, { t: last.t, y: last.y }]
    renderChart(timestampOnly)

    const lastIso = isoOf(new Date(last.t))
    expect(hoverAt(340)).toBe(`${fmtDate(lastIso, true, true)} · 71 kg`)
  })
})