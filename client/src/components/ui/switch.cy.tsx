import React from 'react'
import { Switch } from './switch'

function ControlledSwitch({
  defaultChecked = false,
  disabled = false,
}: {
  defaultChecked?: boolean
  disabled?: boolean
}) {
  const [checked, setChecked] = React.useState(defaultChecked)
  return <Switch checked={checked} onCheckedChange={setChecked} disabled={disabled} />
}

describe('Switch Component', () => {
  it('renders in unchecked state by default', () => {
    cy.mount(<ControlledSwitch />)
    cy.get('[data-state="unchecked"]').should('exist')
  })

  it('renders in checked state when defaultChecked is true', () => {
    cy.mount(<ControlledSwitch defaultChecked />)
    cy.get('[data-state="checked"]').should('exist')
  })

  it('toggles state when clicked', () => {
    cy.mount(<ControlledSwitch />)
    cy.get('[data-state="unchecked"]').should('exist')
    cy.get('button').click()
    cy.get('[data-state="checked"]').should('exist')
  })

  it('toggles back to unchecked when clicked again', () => {
    cy.mount(<ControlledSwitch defaultChecked />)
    cy.get('[data-state="checked"]').should('exist')
    cy.get('button').click()
    cy.get('[data-state="unchecked"]').should('exist')
  })

  it('does not toggle when disabled', () => {
    cy.mount(<ControlledSwitch disabled />)
    cy.get('button').should('be.disabled')
    cy.get('[data-state="unchecked"]').should('exist')
  })

  it('applies disabled styling when disabled', () => {
    cy.mount(<ControlledSwitch disabled />)
    cy.get('button').should('have.class', 'disabled:opacity-50')
  })
})
