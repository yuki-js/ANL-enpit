import { createFileRoute } from '@tanstack/react-router'
import { ShowcaseScreen } from '../components/screens/ShowcaseScreen'

export const Route = createFileRoute('/')({
  component: ShowcaseScreen,
})