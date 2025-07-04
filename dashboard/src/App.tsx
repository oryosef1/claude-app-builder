import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Workflow from './pages/Workflow'
import Todo from './pages/Todo'
import Memory from './pages/Memory'
import Logs from './pages/Logs'
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates'

function App() {
  useRealTimeUpdates()

  return (
    <Router>
      <main role="main">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/todo" element={<Todo />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </Layout>
      </main>
    </Router>
  )
}

export default App