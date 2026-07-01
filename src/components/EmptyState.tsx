import React, { useMemo } from 'react';

interface ActionConfig {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ActionConfig;
  imageUrl?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  imageUrl
}) => {
  const buttonStyle = useMemo(() => ({
    ...styles.actionButton,
    backgroundColor: action?.type === 'secondary' ? 'white' : '#3b82f6',
    color: action?.type === 'secondary' ? '#374151' : 'white',
    border: action?.type === 'secondary' ? '1px solid #d1d5db' : 'none'
  }), [action?.type]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {icon ? (
          <div style={styles.iconContainer}>
            <span style={styles.icon}>{icon}</span>
          </div>
        ) : imageUrl ? (
          <div style={styles.imageContainer}>
            <img 
              src={imageUrl} 
              alt={title}
              style={styles.image}
            />
          </div>
        ) : (
          <div style={styles.iconContainer}>
            <span style={styles.icon}>📭</span>
          </div>
        )}

        <h3 style={styles.title}>{title}</h3>
        
        {description && (
          <p style={styles.description}>{description}</p>
        )}

        {action && (
          <button
            style={buttonStyle}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    minHeight: '300px',
  },
  content: {
    textAlign: 'center' as const,
    maxWidth: '400px',
  },
  iconContainer: {
    marginBottom: '24px',
  },
  icon: {
    fontSize: '80px',
    display: 'block',
  },
  imageContainer: {
    marginBottom: '24px',
  },
  image: {
    width: '200px',
    height: '200px',
    objectFit: 'contain',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  description: {
    margin: '0 0 24px 0',
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#6b7280',
  },
  actionButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default EmptyState;
