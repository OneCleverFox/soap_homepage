import React from 'react';
import { Button, Typography, Box } from '@mui/material';

const TokenDebugger = () => {
  const checkToken = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('🔍 Current Token:', token ? token.substring(0, 50) + '...' : 'No token');
    console.log('🔍 Current User:', user || 'No user');
    alert(`Token: ${token ? 'EXISTS' : 'MISSING'}\nUser: ${user ? 'EXISTS' : 'MISSING'}`);
  };

  const clearStorage = () => {
    localStorage.clear();
    console.log('🧹 LocalStorage cleared');
    alert('LocalStorage cleared! Please login again.');
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Token Debugger</Typography>
      <Button variant="contained" onClick={checkToken} sx={{ mr: 2 }}>
        Check Token
      </Button>
      <Button variant="outlined" onClick={clearStorage}>
        Clear Storage
      </Button>
    </Box>
  );
};

export default TokenDebugger;