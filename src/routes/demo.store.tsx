import { createFileRoute } from '@tanstack/react-router'
import { DemoStoreScreen } from '../components/screens/DemoStoreScreen'

export const Route = createFileRoute('/demo/store')({
  component: DemoStoreScreen,
})