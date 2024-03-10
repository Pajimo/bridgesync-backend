import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import OpenAI from "openai";
import { connectToUserDatabase } from "../../utils/database";
import { containsKeyword } from "../../utils/constants";
import axios from "axios";
export async function messaging(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const userMessage: any = await request.json();

  const { message, userName, channelId } = userMessage;

  const indexUrl = `https://chatbot-knowledgebase.search.windows.net/indexes/bridgesync-source/docs?search=${message}&api-version=2023-11-01`;

  const headers = {
    "Content-Type": "application/json",
    "api-key": process.env.AZURE_AI_SEARCH_KEY,
  };

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

    const messageForSyncAI = containsKeyword(message.toLocaleLowerCase());

    let channelData = workspaceData.channels.filter(
      (id) => id.id === channelId
    );

    let [newChannelList] = channelData;

    if (channelData[0]?.messages.length < 1) {
      await axios
        .get(indexUrl, { headers })
        .then((response) => {
          //   console.log("Search Results:", response.data.value);
          const { value } = response.data;

          channelData[0].messages.push({
            role: "system",
            content:
              `You are a very hardworking medical assistant called SyncAI who helps medical practitioners with questions regarding surgery, best practices, drugs, trials and many more medical helps. Only use the following information to answer questions. try to mention the users name in your reply as often as you can for example, hello "the users namer" how are you today. If the answer is not included, say exactly Hmm, I am not sure. and stop after that. Refuse to answer any question not about the info. Never break character. the following should be the knowledge base to use` +
              value.map((item) => item.content).join(" ") +
              "Please ensure that every piece of information or claim in the summary is accompanied by a reference to the specific article it was derived from. Use inline citations for these references, and format them as simple parenthetical references (e.g., [Article 1], [Article 2]) immediately following the related information.",
            name: "SyncAI",
          });
        })
        .catch((error) => {
          console.error("Error performing search query:", error.response);
        });
    }

    const newMsg = {
      role: "user",
      content: message,
      name: userName,
    };

    channelData[0].messages?.push(newMsg);

    if (messageForSyncAI) {
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
    }

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
