import React, { useState } from 'react';
import GmAuthService from '../services/gmAuthService';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const authService = GmAuthService.getInstance();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setMessage('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await authService.login(username, password);
      
      if (response.success) {
        setMessage('');
        onLoginSuccess();
      } else {
        setMessage(response.message || '登录失败');
      }
    } catch (error) {
      setMessage('登录过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.title}>🔒 GM后台管理系统</h1>
          <p style={styles.subtitle}>授权管理人员专用登录通道</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>用户名</label>
            <input
              type="text"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入GM用户名"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入GM密码"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div style={styles.warning}>
          <p>⚠️ 此系统为GM管理专用，非授权人员禁止访问</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  loginBox: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    color: '#1a1a2e',
    marginBottom: '10px',
    fontSize: '24px'
  },
  subtitle: {
    color: '#666',
    fontSize: '14px'
  },
  form: {
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none'
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    background: '#fee',
    color: '#c33',
    textAlign: 'center'
  },
  warning: {
    marginTop: '20px',
    padding: '15px',
    background: '#fff3cd',
    borderRadius: '8px',
    textAlign: 'center'
  }
};

export default Login;
