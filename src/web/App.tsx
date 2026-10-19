import { Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import MemberPage from './pages/MemberPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MemberPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}
