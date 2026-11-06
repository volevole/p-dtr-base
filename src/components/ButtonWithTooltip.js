import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom'; // 👈 Добавляем импорт

export default function ButtonWithTooltip({ children, onClick, tooltip, style, disabled, to, ...props }) {
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef(null);
  const isLongPressedRef = useRef(false);

  const startPress = () => {
    isLongPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setShowToast(true);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setShowToast(false), 2500);
    }, 500);
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = (e) => {
    if (isLongPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

    // 👈 Общие пропсы для кнопки и ссылки
  const commonProps = {
    onClick: handleClick,
    onPointerDown: startPress,
    onPointerUp: endPress,
    onPointerLeave: endPress,
    onPointerCancel: endPress,
    // 👈 БЛОКИРУЕМ СИСТЕМНОЕ МЕНЮ (работает для Chrome на Android и ПК)
    onContextMenu: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    title: tooltip,
    style: { 
      ...style, 
      userSelect: 'none', 
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none'
    },
    ...props
  };

  const toast = showToast && (
    <div style={{
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: 'rgba(33, 37, 41, 0.9)', color: 'white', padding: '10px 20px',
      borderRadius: '20px', fontSize: '14px', zIndex: 9999, pointerEvents: 'none',
      textAlign: 'center', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      {tooltip}
    </div>
  );

  // Если передан "to", рендерим ссылку, иначе — кнопку
  if (to) {
    return (
      <>
        <Link to={to} {...commonProps}>
          {children}
        </Link>
        {toast}
      </>
    );
  }

  return (
    <>
      <button disabled={disabled} {...commonProps}>
        {children}
      </button>
      {toast}
    </>
  );
}