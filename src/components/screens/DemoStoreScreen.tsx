import { useStore } from '@tanstack/react-store'
import { fullName, store } from '../../lib/demo-store'
import styles from './DemoStoreScreen.module.css'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { Input } from '../ui/Input/Input'
import React from 'react'

export function DemoStoreScreen() {
  const firstName = useStore(store, (state) => state.firstName)
  const lastName = useStore(store, (state) => state.lastName)
  const fName = useStore(fullName)

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <Panel size="large">
          <div className={styles.header}>
            <Text as="h1" variant="h1" color="primary" align="center">
              Store Example
            </Text>
            <Text variant="body" color="secondary" align="center" style={{ marginTop: '0.5rem' }}>
              Enter your name to see reactive state management in action
            </Text>
          </div>

          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <Text as="label" variant="label" color="primary">
                First Name
              </Text>
              <Input
                type="text"
                value={firstName}
                onChange={(e) =>
                  store.setState((state) => ({ ...state, firstName: e.target.value }))
                }
                variant="primary"
                placeholder="Enter your first name"
                size="medium"
              />
            </div>

            <div className={styles.inputGroup}>
              <Text as="label" variant="label" color="primary">
                Last Name
              </Text>
              <Input
                type="text"
                value={lastName}
                onChange={(e) =>
                  store.setState((state) => ({ ...state, lastName: e.target.value }))
                }
                variant="primary"
                placeholder="Enter your last name"
                size="medium"
              />
            </div>
          </div>

          <div className={styles.resultSection}>
            <div className={styles.resultContainer}>
              <Text variant="label" color="secondary" align="center" className={styles.resultLabel}>
                Full Name
              </Text>
              <div className={styles.resultValue}>
                {fName ? (
                  <Text variant="h3" color="primary" align="center">
                    {fName}
                  </Text>
                ) : (
                  <Text variant="body" color="tertiary" align="center" className={styles.emptyState}>
                    Your full name will appear here
                  </Text>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}