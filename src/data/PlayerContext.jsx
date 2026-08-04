import { createContext, useContext, useState } from "react";

const PlayerContext = createContext(null);
const STORAGE_KEY = "jagoan_kelas_player";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function PlayerProvider({ children }) {
  const [player, setPlayer] = useState(readStored);

  function login(p) {
    setPlayer(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }

  function logout() {
    setPlayer(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return <PlayerContext.Provider value={{ player, login, logout }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
