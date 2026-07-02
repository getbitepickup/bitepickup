// src/hooks/useRestaurant.ts
import { useState, useEffect } from 'react';
import { getRestaurantBySubdomain, getRestaurantById } from '../store/apiStore';
import { Restaurant } from '../types';

export const useRestaurant = (slugOrId: string) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        setLoading(true);
        // Try to find by subdomain first, then by ID
        let data;
        try {
          data = await getRestaurantBySubdomain(`${slugOrId}.platform.com`);
        } catch {
          data = await getRestaurantById(slugOrId);
        }
        setRestaurant(data);
        setError(null);
      } catch (err) {
        setError('Restaurant not found');
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };

    if (slugOrId) {
      loadRestaurant();
    }
  }, [slugOrId]);

  return { restaurant, loading, error };
};