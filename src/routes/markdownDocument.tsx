import { createFileRoute } from '@tanstack/react-router'
import MarkdownDebugScreen from '../components/screens/MarkdownDebugScreen'

// Route for /markdownDocument (new name for MarkdownDocument page)
export const Route = createFileRoute('/markdownDocument')({
  component: MarkdownDebugScreen,
})