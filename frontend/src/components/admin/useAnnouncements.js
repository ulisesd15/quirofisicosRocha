import { useCallback, useEffect, useState } from 'react';
import { announcementService } from '../api/announcementService.js';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await announcementService.list();
      setAnnouncements(Array.isArray(data) ? data : data?.announcements ?? []);
    } catch (err) {
      console.error('Error loading announcements:', err);
      setError('Error al cargar anuncios');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAnnouncement = useCallback(
    async (formData, id = null) => {
      if (id !== null) await announcementService.update(id, formData);
      else await announcementService.create(formData);
      await loadAnnouncements();
    },
    [loadAnnouncements]
  );

  const deleteAnnouncement = useCallback(
    async (id) => {
      await announcementService.remove(id);
      await loadAnnouncements();
    },
    [loadAnnouncements]
  );

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements,
    loading,
    error,
    loadAnnouncements,
    saveAnnouncement,
    deleteAnnouncement,
  };
}