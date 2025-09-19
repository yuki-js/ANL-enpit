import { createFileRoute } from '@tanstack/react-router'
import VoiceInputScreen from '../components/screens/VoiceInputScreen'

export const Route = createFileRoute('/voice-input')({
  component: VoiceInputScreen,
})