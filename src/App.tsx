import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { DocumentMetadata } from './components/DocumentMetadata'
import { ScrollRestoration } from './components/ScrollRestoration'
import { Shell } from './components/Shell'
import { AssessmentProvider } from './context/AssessmentContext'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AssessmentPage } from './pages/AssessmentPage'

const informationalPages = () => import('./pages/InformationalPages')
const AboutPage = lazy(() => informationalPages().then(({ AboutPage }) => ({ default: AboutPage })))
const ContactPage = lazy(() => informationalPages().then(({ ContactPage }) => ({ default: ContactPage })))
const FaqPage = lazy(() => informationalPages().then(({ FaqPage }) => ({ default: FaqPage })))
const PhilosophyPage = lazy(() => informationalPages().then(({ PhilosophyPage }) => ({ default: PhilosophyPage })))
const TermsPage = lazy(() => informationalPages().then(({ TermsPage }) => ({ default: TermsPage })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then(({ ResultsPage }) => ({ default: ResultsPage })))
const CapsulePage = lazy(() => import('./pages/CapsulePage').then(({ CapsulePage }) => ({ default: CapsulePage })))
const RestorePage = lazy(() => import('./pages/RestorePage').then(({ RestorePage }) => ({ default: RestorePage })))
const RoleLibraryPage = lazy(() => import('./pages/RoleLibraryPage').then(({ RoleLibraryPage }) => ({ default: RoleLibraryPage })))
const RolePage = lazy(() => import('./pages/RolePage').then(({ RolePage }) => ({ default: RolePage })))

function RouteLoading() {
  return <div className="page-width empty-results" role="status" aria-live="polite"><p>Loading page…</p></div>
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>
}

export default function App() {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppErrorBoundary><ScrollRestoration /><DocumentMetadata /><AssessmentProvider><Routes><Route element={<Shell />}><Route index element={<HomePage />} /><Route path="about" element={<LazyRoute><AboutPage /></LazyRoute>} /><Route path="faq" element={<LazyRoute><FaqPage /></LazyRoute>} /><Route path="contact" element={<LazyRoute><ContactPage /></LazyRoute>} /><Route path="philosophy" element={<LazyRoute><PhilosophyPage /></LazyRoute>} /><Route path="terms" element={<LazyRoute><TermsPage /></LazyRoute>} /><Route path="assessment" element={<AssessmentPage />} /><Route path="results" element={<LazyRoute><ResultsPage /></LazyRoute>} /><Route path="capsule" element={<LazyRoute><CapsulePage /></LazyRoute>} /><Route path="restore" element={<LazyRoute><RestorePage /></LazyRoute>} /><Route path="roles" element={<LazyRoute><RoleLibraryPage /></LazyRoute>} /><Route path="roles/:roleId" element={<LazyRoute><RolePage /></LazyRoute>} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></AssessmentProvider></AppErrorBoundary></BrowserRouter>
}
