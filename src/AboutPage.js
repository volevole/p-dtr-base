// src/AboutPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaProjectDiagram } from 'react-icons/fa';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '40px 20px', textAlign: 'center' }}>
      
      <h1 style={{ color: '#0d47a1', marginBottom: '10px' }}>
        🧠 Ларчик P-DTR
      </h1>
      <h3 style={{ color: '#6c757d', marginBottom: '30px', fontWeight: 'normal' }}>
        База знаний и практических инструментов
      </h3>

      <div style={{ backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '8px', textAlign: 'left', lineHeight: '1.8', color: '#495057', marginBottom: '30px' }}>
        <p>
          <strong>Ларчик</strong> — это профессиональный справочник и система учета для специалистов в области телесных практик и P-DTR.
        </p>
        <p>
          Приложение объединяет в себе структурированную базу знаний (мышцы, органы, меридианы, дисфункции) с удобным инструментарием для ведения приёмов и работы с пациентами.
        </p>
        <p>
          Может использоваться и просто как инструментарий для ведения приёмов и работы с пациентами/клиентами в других сферах (медицина, косметология и т.д.).
        </p>
        <p>
          Запись на приём можно настроить так, что сами пациенты/клиенты смогут записываться на свободное время самостоятельно.
        </p>
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaHeart color="#dc3545" /> Анатомический справочник
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaProjectDiagram color="#007bff" /> Учет и аналитика
          </span>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#fff3cd', 
        color: '#856404', 
        padding: '15px', 
        borderRadius: '8px', 
        fontSize: '14px',
        marginBottom: '30px' 
      }}>
        ⚠️ <strong>Внимание:</strong> Приложение предназначено для профессионального использования. 
        Доступ к полному функционалу предоставляется после подтверждения учетной записи администратором.
        <br />Есть возможность самостоятельно получить на короткое время демо-доступ для ознакомления.
      </div>

      <Link 
        to="/login" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        <FaArrowLeft style={{ marginRight: '10px' }} /> Вернуться на страницу входа
      </Link>
      
    </div>
  );
}