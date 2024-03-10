import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { connectToUserDatabase } from "../../utils/database";
import bcrypt = require("bcryptjs");

export async function login(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const loginData: any = (await request.json()) as any;

  const { email, password } = loginData;

  const userDb = await connectToUserDatabase();
  const collection = userDb.collection("Users");
  const workspaceCollection = userDb.collection("Workspace");

  let workstation = await workspaceCollection.findOne({
    spaceId: "8d692ffde822-43f8-934a-9152c09b2d44",
  });

  let person = await collection.findOne({ email });

  if (!person) {
    return {
      status: 400,
      body: `Email or password incorrect`,
    };
  }

  const checkpass = await bcrypt.compareSync(password, person.password);

  if (!checkpass) {
    return {
      status: 400,
      body: `password incorrect`,
    };
  }

  const returiningObj = {
    userData: person,
    workspaceData: workstation,
    message: "Log in successful",
  };

  return { body: JSON.stringify(returiningObj) };
}

app.http("login", {
  route: "user/login",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: login,
});
