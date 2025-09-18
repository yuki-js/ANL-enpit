import { createFileRoute } from '@tanstack/react-router'
import ChatScreen from '../components/screens/ChatScreen'

export const Route = createFileRoute('/chat')({
  component: ChatScreen,
})

export default Route