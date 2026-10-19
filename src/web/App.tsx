import { Route, Routes } from 'react-router-dom'
import MemberPage from './pages/MemberPage'

function AdminPlaceholder() {
  return <div>Administrador</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MemberPage />} />
      <Route path="/admin" element={<AdminPlaceholder />} />
    </Routes>
  )
}
