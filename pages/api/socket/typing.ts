import { NextApiRequest } from "next";
import { NextApiResponseServerIo } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { chatId, isTyping, user, socketId } = body || {};

    if (!chatId || !user) {
      return res.status(400).json({ error: "Missing chatId or user" });
    }

    if (res?.socket?.server?.io) {
      const eventKey = `chat:${chatId}:typing`;
      res.socket.server.io.emit(eventKey, {
        user,
        socketId,
        isTyping: Boolean(isTyping)
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[TYPING_API_ERROR]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
