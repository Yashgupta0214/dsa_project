import { db } from "@/lib/db";

export const getOrCreateConversation = async (
  memberOneId: string,
  memberTwoId: string
) => {
  let conversation = await findConversation(memberOneId, memberTwoId);

  if (!conversation) {
    conversation = await createNewConversation(memberOneId, memberTwoId);
  }

  return conversation;
};

export const getOrCreateConversationId = async (
  memberOneId: string,
  memberTwoId: string
) => {
  let conversation = await findConversationId(memberOneId, memberTwoId);

  if (!conversation) {
    conversation = await createNewConversationId(memberOneId, memberTwoId);
  }

  return conversation;
};

const findConversation = async (
  memberOneId: string,
  memberTwoId: string
) => {
  try {
    return await db.conversation.findFirst({
      where: {
        OR: [
          {
            memberOneId: memberOneId,
            memberTwoId: memberTwoId
          },
          {
            memberOneId: memberTwoId,
            memberTwoId: memberOneId
          }
        ]
      },
      include: {
        memberOne: {
          include: { profile: true }
        },
        memberTwo: {
          include: { profile: true }
        }
      }
    });
  } catch (error) {
    return null;
  }
};

const findConversationId = async (memberOneId: string, memberTwoId: string) => {
  try {
    return await db.conversation.findFirst({
      where: {
        OR: [
          {
            memberOneId: memberOneId,
            memberTwoId: memberTwoId
          },
          {
            memberOneId: memberTwoId,
            memberTwoId: memberOneId
          }
        ]
      },
      select: {
        id: true
      }
    });
  } catch (error) {
    return null;
  }
};

const createNewConversation = async (
  memberOneId: string,
  memberTwoId: string
) => {
  try {
    return await db.conversation.create({
      data: {
        memberOneId,
        memberTwoId
      },
      include: {
        memberOne: {
          include: { profile: true }
        },
        memberTwo: {
          include: { profile: true }
        }
      }
    });
  } catch (error) {
    return null;
  }
};

const createNewConversationId = async (
  memberOneId: string,
  memberTwoId: string
) => {
  try {
    return await db.conversation.create({
      data: {
        memberOneId,
        memberTwoId
      },
      select: {
        id: true
      }
    });
  } catch (error) {
    return null;
  }
};
