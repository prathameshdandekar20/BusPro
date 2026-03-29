import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Ticket from '../components/Ticket';

const TicketViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/rides/ticket/${id}`);
        setTicketData(res.data);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError('Ticket not found or invalid QR code.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
        <p className="text-muted" style={{ marginLeft: '10px' }}>Loading Ticket...</p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}>
        <h2 style={{ color: '#d32f2f' }}>{error}</h2>
        <button 
          onClick={() => navigate('/')} 
          style={{ marginTop: '20px', padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#e0e0e0', padding: '20px 0' }}>
      <Ticket 
        ride={ticketData} 
        user={ticketData.userId} 
        onPrint={handlePrint} 
        onClose={() => navigate('/')} 
      />
    </div>
  );
};

export default TicketViewPage;
