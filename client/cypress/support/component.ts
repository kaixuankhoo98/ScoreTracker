// Cypress Component Testing Support File
import { mount } from '@cypress/react'
import '../../src/index.css'

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)
