import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Subscribes to real-time ballot updates for a specific election.
 * Returns { totalVotes, voteCounts, isLive }
 */
export function useElectionSocket(electionId, initialVoteCounts = {}, initialTotal = 0) {
  const [voteCounts, setVoteCounts] = useState(initialVoteCounts);
  const [totalVotes, setTotalVotes] = useState(initialTotal);
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef(null);

  // Sync initial values when props change (e.g. data loads)
  useEffect(() => {
    setVoteCounts(initialVoteCounts);
    setTotalVotes(initialTotal);
  }, [JSON.stringify(initialVoteCounts), initialTotal]);

  useEffect(() => {
    if (!electionId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:election', electionId);
      setIsLive(true);
    });

    socket.on('disconnect', () => setIsLive(false));

    socket.on('ballot:update', (data) => {
      if (data.electionId !== electionId) return;
      setVoteCounts(data.voteCounts || {});
      setTotalVotes(data.totalVotes || 0);
    });

    socket.on('election:completed', (data) => {
      if (data.electionId !== electionId) return;
      setIsLive(false);
    });

    return () => {
      socket.emit('unsubscribe:election', electionId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [electionId]);

  return { voteCounts, totalVotes, isLive };
}
