import { useCallback, useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../lib/socket";

export function useBoardRealtime(boardId, handlers) {
  const [viewers, setViewers] = useState([]);
  const [cursors, setCursors] = useState({});

  // Listeners stay stable; they always call the latest handlers.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!boardId) return;
    const socket = getSocket();
    const call = (name) => (payload) => handlersRef.current?.[name]?.(payload);

    const join = () => socket.emit("wb:join", boardId);
    const upsertViewer = (user) =>
      setViewers((list) => (list.some((v) => v.id === user.id) ? list : [...list, user]));
    const dropViewer = (user) => {
      if (!user) return;
      setViewers((list) => list.filter((v) => v.id !== user.id));
      setCursors((c) => {
        const next = { ...c };
        delete next[user.id];
        return next;
      });
    };

    const listeners = {
      connect: join, // re-join after a reconnect
      "presence:sync": ({ users }) => setViewers(users || []),
      "presence:join": ({ user }) => upsertViewer(user),
      "presence:leave": ({ user }) => dropViewer(user),
      "presence:cursor": ({ user, x, y }) =>
        setCursors((c) => ({ ...c, [user.id]: { x, y, name: user.name } })),
      "element:created": call("onElementCreated"),
      "element:updated": call("onElementUpdated"),
      "element:deleted": ({ id }) => handlersRef.current?.onElementDeleted?.(id),
      "element:live": ({ element }) => handlersRef.current?.onLive?.(element),
      "board:updated": call("onBoardUpdated"),
      "member:added": call("onMemberAdded"),
      "member:removed": ({ userId }) => handlersRef.current?.onMemberRemoved?.(userId),
    };

    for (const [event, fn] of Object.entries(listeners)) socket.on(event, fn);
    connectSocket();
    if (socket.connected) join();

    return () => {
      socket.emit("wb:leave", boardId);
      for (const [event, fn] of Object.entries(listeners)) socket.off(event, fn);
      setViewers([]);
      setCursors({});
    };
  }, [boardId]);

  const emitCursor = useCallback(
    (x, y) => {
      const socket = getSocket();
      if (socket.connected) socket.emit("presence:cursor", { boardId, x, y });
    },
    [boardId],
  );

  const emitLive = useCallback(
    (element) => {
      const socket = getSocket();
      if (socket.connected) socket.emit("element:live", { boardId, element });
    },
    [boardId],
  );

  return { viewers, cursors, emitCursor, emitLive };
}
