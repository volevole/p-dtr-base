// src/hooks/useLongPress.js
import { useState, useRef } from 'react';

export function useLongPress(callback, ms = 500) {
  const [isLongPressed, setIsLongPressed] = useState(false);
  const timerRef = useRef(null);

  const start = (text) => {
    setIsLongPressed(false);
    
    // Запускаем таймер
    timerRef.current = setTimeout(() => {
      setIsLongPressed(true);
      callback(text); // Вызываем переданную функцию (например, alert)
      
      // Вибрация для мобилок
      if (navigator.vibrate) navigator.vibrate(50);
    }, ms);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // Возвращаем объект с обработчиками и флагом
  return {
    isLongPressed,
    // Специальная функция-обертка для onClick, чтобы блокировать клик после долгого тапа
    onClick: (e) => {
      if (isLongPressed) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    // Обработчики для нажатия/отпускания
    onPointerDown: (e, text) => start(text),
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}