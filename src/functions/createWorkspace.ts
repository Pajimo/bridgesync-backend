import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { connectToUserDatabase } from "../../utils/database";

export async function createWorkspace(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const workspaceName = "Sync Health";

  const uuid = uuidv4();

  const workspaceId = uuid.replace("-", "");

  try {
    const userDb = await connectToUserDatabase();
    const workspaceCollection = userDb.collection("Workspace");
    // const userCollection = userDb.collection("Users");

    const newWorkspace = {
      _id: workspaceId,
      spaceId: workspaceId,
      name: workspaceName,
      channels: [
        {
          name: "general",
          id: uuidv4().replace("-", ""),
          members: [],
          messages: [],
        },
      ],
      members: [],
    };

    await workspaceCollection.insertOne(newWorkspace);

    return { body: `workspace created` };
  } catch (err) {
    context.log(err);
    return { status: 500, body: "Internal server error." };
  }
}

app.http("createWorkspace", {
  route: "create/workspace",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: createWorkspace,
});
