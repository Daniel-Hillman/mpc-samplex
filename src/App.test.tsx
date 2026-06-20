import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('MPC Studio shell', () => {
  it('renders the touch-first studio surface with browser audio preview', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'MPC Studio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /16 Levels/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Audition shape/i })).toBeInTheDocument()
    expect(screen.getByText(/Scale notes \(7\):/i)).toBeInTheDocument()
    expect(screen.getByText(/Visible notes \(7\/7\):/i)).toBeInTheDocument()
  })

  it('shows simple in-key chords and pad recipes on the chord page', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Chords' }))

    expect(screen.getByText('Scale and sample')).toBeInTheDocument()
    expect(screen.getByText('Best in-key chords')).toBeInTheDocument()
    expect(screen.getByText(/Press:/)).toBeInTheDocument()
    expect(screen.getByText('fourth')).toBeInTheDocument()
    expect(screen.queryByLabelText('Transport')).not.toBeInTheDocument()
  })

  it('shows a dedicated chord pads builder with a playable recipe', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Chord Pads' }))

    expect(screen.getByText('Chord pad builder')).toBeInTheDocument()
    expect(screen.getByText(/Press these pads/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hear chord/i })).toBeInTheDocument()
  })
})
