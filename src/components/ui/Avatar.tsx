import React, { useState } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  shape?: 'circle' | 'square';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  name,
  size = 'md',
  shape = 'circle',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const baseClasses = 'avatar';
  const sizeClass = `avatar-${size}`;
  const shapeClass = `avatar-${shape}`;

  const combinedClasses = [
    baseClasses,
    sizeClass,
    shapeClass,
    className,
  ].filter(Boolean).join(' ');

  const showImage = src && !imageError;

  return (
    <div className={combinedClasses}>
      {showImage ? (
        <img
          src={src}
          alt={alt || name}
          className="avatar-image"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="avatar-fallback">
          {name ? getInitials(name) : '?'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
