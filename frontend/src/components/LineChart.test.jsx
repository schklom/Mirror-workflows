import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Window } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LineChart from './LineChart.jsx'

let dom
let root
let container

const firstPoints = [
  { t: Date.UTC(2026, 0, 1), y: 80, d: '2026-01-01' },
  { t: Date.UTC(2026, 0, 15), y: 82, d: '2026-01-15' },
]
const nextPoints = [
  { t: Date.UTC(2026, 1, 1), y: 78, d: '2026-02-01' },
  { t: Date.UTC(2026, 1, 15), y: 79, d: '2026-02-15' },
]

function installDom() {
  dom = new Window({ url: 'http://localhost/' })
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'SVGElement', 'Node', 'Element', 'Event', 'MouseEvent']) {
    globalThis[key] = dom[key]
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
}

async function render(points) {
  await act(async () => { root.render(<LineChart points={points} unit="kg" />) })
  const svg = container.querySelector('svg')
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, width: 340 }),
  })
}

async function hoverAt(clientX) {
  await act(async () => {
    container.querySelector('.chart-i').dispatchEvent(new dom.MouseEvent('mousemove', {
      bubbles: true,
      clientX,
    }))
  })
}

beforeEach(() => {
  installDom()
})

afterEach(async () => {
  if (root) await act(async () => { root.unmount() })
  root = null
  container = null
  dom.close()
  dom = null
})

describe('LineChart hover state', () => {
  it('clears the tooltip and hover marker when points are replaced, then allows hovering again', async () => {
    await render(firstPoints)
    await hoverAt(170)

    expect(container.querySelector('.ctip')).toBeTruthy()
    expect(container.querySelector('.cvl')).toBeTruthy()

    await render(nextPoints)

    expect(container.querySelector('.ctip')).toBeNull()
    expect(container.querySelector('.cvl')).toBeNull()
    expect(container.querySelector('.chl')).toBeNull()

    await hoverAt(170)
    expect(container.querySelector('.ctip')).toBeTruthy()
    expect(container.querySelector('.cvl')).toBeTruthy()
  })
})
