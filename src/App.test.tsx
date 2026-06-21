import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('MPC Samplex shell', () => {
  it('renders the touch-first studio surface with browser audio preview', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'MPC Samplex' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /16 Levels/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chord Pads' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Groove' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Audition shape/i })).toBeInTheDocument()
    expect(screen.getByText(/Scale notes \(7\):/i)).toBeInTheDocument()
    expect(screen.getByText(/Visible notes \(7\/7\):/i)).toBeInTheDocument()
  })

  it('shows simple in-key chords and pad recipes on the chord page', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Chords' }))

    expect(screen.getByText('Scale and sample')).toBeInTheDocument()
    expect(screen.getByText('1st to 7th chords')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Color chords' })).toBeInTheDocument()
    expect(screen.getByText(/Press:/)).toBeInTheDocument()
    expect(screen.getByText('fourth')).toBeInTheDocument()
    expect(screen.getByText('Selected chords')).toBeInTheDocument()
    expect(screen.getByText(/tap the Add button under the pads/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add Cm9/i }))
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Up' })).toBeDisabled()
    expect(screen.getAllByText(/P4 \+ P6/).length).toBeGreaterThan(1)
    expect(screen.queryByLabelText('Transport')).not.toBeInTheDocument()
  })
})
