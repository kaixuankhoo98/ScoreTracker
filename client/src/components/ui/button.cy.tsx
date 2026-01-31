import { Button } from './button'

describe('Button Component', () => {
  it('renders with default variant', () => {
    cy.mount(<Button>Click me</Button>)
    cy.contains('Click me').should('be.visible')
  })

  it('renders with destructive variant', () => {
    cy.mount(<Button variant="destructive">Delete</Button>)
    cy.contains('Delete').should('be.visible')
  })

  it('handles click events', () => {
    const onClick = cy.stub().as('onClick')
    cy.mount(<Button onClick={onClick}>Click me</Button>)
    cy.contains('Click me').click()
    cy.get('@onClick').should('have.been.calledOnce')
  })
})
