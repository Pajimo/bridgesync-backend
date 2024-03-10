import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { connectToUserDatabase } from "../../utils/database";

export async function fetchWorkspace(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const userDb = await connectToUserDatabase();
    const workspaceCollection = userDb.collection("Workspace");

    let workstation = await workspaceCollection.findOne({
      spaceId: "8d692ffde822-43f8-934a-9152c09b2d44",
    });

    const returiningObj = {
      workspaceData: workstation,

      message: "fetched successfully",
    };

    return { body: JSON.stringify(returiningObj) };
  } catch (error) {
    context.log("Registration error:", error);
    return { status: 500, body: "Internal server error." };
  }
}

app.http("fetchWorkspace", {
  route: "fetch/workstation",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: fetchWorkspace,
});
