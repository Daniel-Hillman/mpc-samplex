import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('MPC Studio shell', () => {
  it('renders the touch-first studio surface without requiring MIDI', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'MPC Studio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /16 Levels/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Audition shape/i })).toBeInTheDocument()
  })

  it('lets users reorder and remove progression chords while showing the MIDI view', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Chords' }))

    expect(screen.getByLabelText('MIDI view')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Remove /i })).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: /Move Fm7 earlier/i }))
    expect(screen.getByText(/1\. Fm7/)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Remove /i })[0])
    expect(screen.getAllByRole('button', { name: /Remove /i })).toHaveLength(3)
  })
})
