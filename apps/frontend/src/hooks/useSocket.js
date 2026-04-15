import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(matchId) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchData, setMatchData] = useState(null);

  useEffect(() => {
    if (!matchId) return;

    // Connect securely
    const socketInstance = io('http://127.0.0.1:3001');

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket Connected:', socketInstance.id);
      socketInstance.emit('join-match', matchId);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('match-update', (data) => {
      // Keep state locally synchronized directly from WebSocket
      setMatchData(data);
    });

    setSocket(socketInstance);

    // Automagic Cleanup Unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [matchId]);

  return { socket, isConnected, matchData };
}
