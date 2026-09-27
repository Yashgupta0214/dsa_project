import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Member, Message, Profile } from "@prisma/client";

import { useSocket } from "@/components/providers/socket-provider";

type ChatSocketProps = {
  addKey: string;
  updateKey: string;
  queryKey: string;
};

type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile;
  };
};

export const useChatSocket = ({
  addKey,
  updateKey,
  queryKey
}: ChatSocketProps) => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.on(updateKey, (message: any) => {
      queryClient.setQueryData([queryKey], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        // Handle bulk direct message seen update
        if (message?.type === "SEEN_ALL") {
          const newData = oldData.pages.map((page: any) => {
            return {
              ...page,
              items: page.items.map((item: any) => ({
                ...item,
                seen: true,
                seenAt: message.seenAt || new Date().toISOString()
              }))
            };
          });

          return {
            ...oldData,
            pages: newData
          };
        }

        // Handle channel messages read receipts update
        if (message?.type === "CHANNEL_MESSAGES_READ") {
          const messageIdSet = new Set(message.messageIds || []);
          const newReceipt = message.readReceipt;

          const newData = oldData.pages.map((page: any) => {
            return {
              ...page,
              items: page.items.map((item: any) => {
                if (messageIdSet.has(item.id)) {
                  const existing = item.readReceipts || [];
                  const alreadyHas = existing.some(
                    (r: any) => r.memberId === newReceipt.memberId
                  );
                  if (!alreadyHas) {
                    return {
                      ...item,
                      readReceipts: [...existing, newReceipt]
                    };
                  }
                }
                return item;
              })
            };
          });

          return {
            ...oldData,
            pages: newData
          };
        }

        const newData = oldData.pages.map((page: any) => {
          return {
            ...page,
            items: page.items.map((item: MessageWithMemberWithProfile) => {
              if (item.id === message.id) {
                return message;
              }
              return item;
            })
          };
        });

        return {
          ...oldData,
          pages: newData
        };
      });
    });

    socket.on(addKey, (message: MessageWithMemberWithProfile) => {
      queryClient.setQueryData([queryKey], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [
              {
                items: [message]
              }
            ]
          };
        }

        // Deduplicate: avoid adding if already in the list
        const exists = oldData.pages.some((page: any) =>
          page.items?.some((item: any) => item.id === message.id)
        );

        if (exists) {
          return oldData;
        }

        const newData = [...oldData.pages];

        newData[0] = {
          ...newData[0],
          items: [message, ...newData[0].items]
        };

        return {
          ...oldData,
          pages: newData
        };
      });
    });

    return () => {
      socket.off(addKey);
      socket.off(updateKey);
    };
  }, [queryClient, addKey, queryKey, socket, updateKey]);
};
