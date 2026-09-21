import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { DocumentMetadata } from './components/DocumentMetadata'
import { ScrollRestoration } from './components/ScrollRestoration'
import { Shell } from './components/Shell'
import { AssessmentProvider } from './context/AssessmentContext'
import { AssessmentPage } from './pages/AssessmentPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { FaqPage } from './pages/FaqPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PhilosophyPage } from './pages/PhilosophyPage'
import { ResultsPage } from './pages/ResultsPage'
import { RolePage } from './pages/RolePage'

export default function App() {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppErrorBoundary><ScrollRestoration /><DocumentMetadata /><AssessmentProvider><Routes><Route element={<Shell />}><Route index element={<HomePage />} /><Route path="about" element={<AboutPage />} /><Route path="faq" element={<FaqPage />} /><Route path="contact" element={<ContactPage />} /><Route path="philosophy" element={<PhilosophyPage />} /><Route path="assessment" element={<AssessmentPage />} /><Route path="results" element={<ResultsPage />} /><Route path="roles/:roleId" element={<RolePage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></AssessmentProvider></AppErrorBoundary></BrowserRouter>
}
