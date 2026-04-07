import React from 'react'
import { Box } from '@mui/material'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'

const App: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <Dashboard />
    </Box>
  )
}

export default App
