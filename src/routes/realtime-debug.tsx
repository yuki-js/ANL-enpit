import { createFileRoute } from '@tanstack/react-router'
import RealtimeDebugScreen from '../components/screens/RealtimeDebugScreen'

export const Route = createFileRoute('/realtime-debug')({
  component: RealtimeDebugScreen,
})