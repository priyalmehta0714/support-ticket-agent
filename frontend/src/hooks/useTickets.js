import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTickets = useCallback(async (statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter 
        ? `${API_BASE_URL}/tickets?status=${statusFilter}&limit=100`
        : `${API_BASE_URL}/tickets?limit=100`;
      const response = await axios.get(url);
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.response?.data?.error || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicketById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/tickets/${id}`);
      setCurrentTicket(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      setError(err.response?.data?.error || 'Failed to fetch ticket details');
    } finally {
      setLoading(false);
    }
  }, []);

  const approveTicket = useCallback(async (id, finalReply) => {
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/decisions/${id}/approve`, {
        final_reply: finalReply
      });
      // Refresh current ticket if it's the one that was approved
      if (currentTicket && currentTicket.id === id) {
        await fetchTicketById(id);
      }
      return response.data;
    } catch (err) {
      console.error('Error approving ticket:', err);
      setError(err.response?.data?.error || 'Failed to approve ticket');
      throw err;
    }
  }, [currentTicket, fetchTicketById]);

  const rejectTicket = useCallback(async (id, reason) => {
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/decisions/${id}/reject`, {
        reason
      });
      // Refresh current ticket if it's the one that was rejected
      if (currentTicket && currentTicket.id === id) {
        await fetchTicketById(id);
      }
      return response.data;
    } catch (err) {
      console.error('Error rejecting ticket:', err);
      setError(err.response?.data?.error || 'Failed to reject ticket');
      throw err;
    }
  }, [currentTicket, fetchTicketById]);

  const createTicket = useCallback(async (ticketData) => {
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/tickets`, ticketData);
      return response.data;
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err.response?.data?.error || 'Failed to submit ticket');
      throw err;
    }
  }, []);

  const deleteTicket = useCallback(async (id) => {
    setError(null);
    try {
      const response = await axios.delete(`${API_BASE_URL}/tickets/${id}`);
      setTickets(prev => prev.filter(ticket => ticket.id !== id));
      if (currentTicket && currentTicket.id === id) {
        setCurrentTicket(null);
      }
      return response.data;
    } catch (err) {
      console.error('Error deleting ticket:', err);
      setError(err.response?.data?.error || 'Failed to delete ticket');
      throw err;
    }
  }, [currentTicket]);

  const fetchKnowledgeBase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/knowledge`);
      setKnowledgeBase(response.data);
    } catch (err) {
      console.error('Error fetching knowledge base:', err);
      setError(err.response?.data?.error || 'Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  }, []);

  const createKnowledgeEntry = useCallback(async (entryData) => {
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/knowledge`, entryData);
      return response.data;
    } catch (err) {
      console.error('Error creating knowledge entry:', err);
      setError(err.response?.data?.error || 'Failed to create knowledge entry');
      throw err;
    }
  }, []);

  return {
    tickets,
    currentTicket,
    knowledgeBase,
    loading,
    error,
    fetchTickets,
    fetchTicketById,
    approveTicket,
    rejectTicket,
    createTicket,
    deleteTicket,
    fetchKnowledgeBase,
    createKnowledgeEntry
  };
}
