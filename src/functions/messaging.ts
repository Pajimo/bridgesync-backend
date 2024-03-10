import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import OpenAI from "openai";
import { connectToUserDatabase } from "../../utils/database";
export async function messaging(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const userMessage: any = await request.json();

  const { message, userType, channelId } = userMessage;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  try {
    const userDb = await connectToUserDatabase();
    const workspaceCollection = userDb.collection("Workspace");
    let workspaceData = await workspaceCollection.findOne({
      spaceId: "8d692ffde822-43f8-934a-9152c09b2d44",
    });

    let channelData = workspaceData.channels.filter(
      (id) => id.id === channelId
    );

    let [newChannelList] = channelData;

    channelData[0]?.messages.length < 1 &&
      channelData[0].messages.push({
        role: "system",
        content:
          "You are a very hardworking medical assistant called SyncAI who helps medical practitioners with questions regarding surgery, best practices, drugs, trials and many more medical helps.",
        name: "SyncAI",
      });

    const newMsg = {
      role: "user",
      content: message,
      name: "Olamide",
    };

    channelData[0].messages?.push(newMsg);

    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: channelData[0].messages,
      temperature: 1,
    });

    channelData[0].messages?.push({
      role: "assistant",
      content: response.choices[0].message.content,
      name: "SyncAI",
    });

    await workspaceCollection.updateOne(
      { _id: workspaceData._id },
      {
        $set: {
          channels: [newChannelList],
        },
      }
    );

    const returiningObj = {
      workspaceData: {
        ...workspaceData,
        channels: [newChannelList],
      },
      message: "replied successfully",
    };

    return {
      body: JSON.stringify(returiningObj),
    };
  } catch (err) {
    context.log(err);
    return { status: 500, body: "Internal server error." };
  }
}

app.http("messaging", {
  route: "messaging/workspace",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: messaging,
});
