import { createFileRoute } from '@tanstack/react-router'
import HomeHeroScreen from '../components/screens/HomeHeroScreen'

export const Route = createFileRoute('/')({
  component: HomeHeroScreen,
})