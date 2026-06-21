import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('MPC Samplex shell', () => {
  it('renders the touch-first studio surface with browser audio preview', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'MPC Samplex' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '16 Levels / Scales' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Melodies' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Master key C Minor/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chord Pads' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Groove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Library' })).not.toBeInTheDocument()
    expect(screen.getByText('What are you making?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Find safe notes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Build chords/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Make a melody/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Audition chord/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sound' })).toHaveValue('warmKeys')
    expect(screen.getByRole('button', { name: 'Natural' })).toBeInTheDocument()
    expect(screen.getByText('Play this now')).toBeInTheDocument()
    expect(screen.getByText(/Safe pads:/i)).toBeInTheDocument()
  })

  it('uses one master key across the pages', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Master key C Minor/i }))
    const masterKeyPanel = screen.getByRole('dialog', { name: 'Master key' })

    fireEvent.change(within(masterKeyPanel).getByRole('combobox', { name: 'Song key' }), {
      target: { value: 'A' },
    })
    fireEvent.change(within(masterKeyPanel).getByRole('combobox', { name: 'Scale' }), {
      target: { value: 'major' },
    })

    expect(screen.getByRole('button', { name: /Master key A Major/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Master key A Major/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Chords' }))

    expect(screen.getAllByText('A Major').length).toBeGreaterThan(1)
    expect(screen.queryByRole('combobox', { name: 'Track key' })).not.toBeInTheDocument()
  })

  it('shows simple in-key chords and pad recipes on the chord page', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Chords' }))

    expect(screen.getByText('Scale and sample')).toBeInTheDocument()
    expect(screen.getByText('1st to 7th chords')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Color chords' })).toBeInTheDocument()
    expect(screen.getByText('Build a loop')).toBeInTheDocument()
    expect(screen.getByText('What next?')).toBeInTheDocument()
    expect(screen.getByText(/Press:/)).toBeInTheDocument()
    expect(screen.getByText('fourth')).toBeInTheDocument()
    expect(screen.getByText('Progression map')).toBeInTheDocument()
    expect(screen.getByText('Play this on MPC')).toBeInTheDocument()
    expect(screen.getByText('Bass options')).toBeInTheDocument()
    expect(screen.getByText('Playbook')).toBeInTheDocument()
    expect(screen.getByText(/tap the Add button under the pads/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add Cm9/i }))
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Up' })).toBeDisabled()
    expect(screen.getByText('Chord pads')).toBeInTheDocument()
    expect(screen.getAllByText(/P4 \+ P6/).length).toBeGreaterThan(1)
    expect(screen.queryByLabelText('Transport')).not.toBeInTheDocument()
  })

  it('shows melody role pads and phrase recipes on the melodies page', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Melodies' }))

    expect(screen.getByText('Melody setup')).toBeInTheDocument()
    expect(screen.getByText('Melody notes')).toBeInTheDocument()
    expect(screen.getByText('Try these shapes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Simple hook/i })).toBeInTheDocument()
    expect(screen.getByText(/Gold = home/)).toBeInTheDocument()
  })

  it('keeps the 16 Levels page focused on scales and retuning', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '16 Levels / Scales' }))

    expect(screen.getByText('Scale setup')).toBeInTheDocument()
    expect(screen.getByText('Highlighted 16 Levels')).toBeInTheDocument()
    expect(screen.getByText('7 notes in scale')).toBeInTheDocument()
    expect(screen.getByText('Repitch another one-shot')).toBeInTheDocument()
    expect(screen.queryByText('Best shapes')).not.toBeInTheDocument()
    expect(screen.queryByText('Chord')).not.toBeInTheDocument()
  })
})
