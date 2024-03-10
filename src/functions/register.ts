import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import moment = require("moment");
import bcrypt = require("bcryptjs");
import { connectToUserDatabase } from "../../utils/database";
import { v4 as uuidv4 } from "uuid";

export async function registerUsers(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // context.log(`Http function processed request for url "${request.url}"`);

  // const name = request.query.get("name") || (await request.text()) || "world";

  if (request.method !== "POST") {
    return {
      status: 405,
      body: `This endpoint accepts only POST requests.`,
    };
  }

  const uuid = uuidv4();

  const userId = uuid.replace("-", "");

  const registerData: any = (await request.json()) as any;

  //   context.log(registerData, "body");

  const { email, password, firstName, lastName } = registerData;

  if (!email || !password || !firstName || !lastName) {
    return {
      status: 400,
      body: `All fields are required`,
    };
  }

  try {
    const userDb = await connectToUserDatabase();
    const collection = userDb.collection("Users");
    const workspaceCollection = userDb.collection("Workspace");

    let existingUser = await collection.findOne({ email });

    let workstation = await workspaceCollection.findOne({
      spaceId: "8d692ffde822-43f8-934a-9152c09b2d44",
    });

    if (existingUser) {
      return {
        status: 400,
        body: `Account already exist`,
      };
    }
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const newUserData = {
      _id: uuid,
      userId: uuid,
      firstName,
      lastName,
      password: hashedPassword,
      email,
    };
    await collection.insertOne(newUserData);
    let [newChannelList] = workstation.channels;

    newChannelList.members.push({
      _id: userId,
      userId: userId,
      firstName,
      lastName,
      email,
    });
    // context.log(workstation, " wor");
    await workspaceCollection.updateOne(
      { _id: workstation._id },
      {
        $set: {
          members: [
            ...workstation.members,
            {
              _id: userId,
              userId: userId,
              firstName,
              lastName,
              email,
              type: "member",
            },
          ],
          channels: [newChannelList],
        },
      }
    );

    const returiningObj = {
      userData: newUserData,
      workspaceData: {
        ...workstation,
        members: [
          ...workstation.members,
          { _id: userId, userId: userId, firstName, lastName, email },
        ],
        channels: [newChannelList],
      },

      message: "Registered successfully",
    };

    return { body: JSON.stringify(returiningObj) };
  } catch (error) {
    context.log("Registration error:", error);
    return { status: 500, body: "Internal server error." };
  }

  // return { body: `Hello, ${name}!` };
}

app.http("registerUsers", {
  route: "user/register",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: registerUsers,
});
