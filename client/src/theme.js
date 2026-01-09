import { createTheme } from '@mui/material/styles';

export const getTheme = (mode = 'light') => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1890ff',
        light: '#40a9ff',
        dark: '#096dd9'
      },
      secondary: {
        main: '#52c41a',
        light: '#73d13d',
        dark: '#389e0d'
      },
      error: {
        main: '#ff4d4f',
        light: '#ff7875',
        dark: '#cf1322'
      },
      warning: {
        main: '#faad14',
        light: '#ffc53d',
        dark: '#d48806'
      },
      info: {
        main: '#1890ff'
      },
      success: {
        main: '#52c41a'
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#141414',
        paper: mode === 'light' ? '#ffffff' : '#1f1f1f'
      },
      text: {
        primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'
      }
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600
      }
    },
    shape: {
      borderRadius: 8
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' 
              ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              : '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
          }
        }
      }
    }
  });
};

