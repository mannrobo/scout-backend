import Router from "koa-router";
import Koa from "koa";
import admin from "firebase-admin";
import error from "../error";

export default (router: Router, app: Koa) => {
  const auth = admin.auth();
  const database = admin.firestore();

  // Use invite code
  router.get("/invite/use", async (ctx, next) => {
    const { code, jwt } = ctx.query;
    if (!code)
      ctx.body = error("invite.no.code", "No invite code was supplied");
    if (!jwt)
      ctx.body = error(
        "invite.no.jwt",
        "No JWT was supplied. Try signing in again"
      );

    // Get the user making the request
    let decodedToken = await auth
      .verifyIdToken(jwt, true)
      .catch(
        () =>
          (ctx.body = error(
            "invite.invalid.jwt",
            "JWT isn't valid. Try signing out and back in again"
          ))
      );
    if (decodedToken.hasOwnProperty("error")) {
      ctx.body = error("invite.invalid.jwt", "Invalid JWT");
      return;
    }
    decodedToken = decodedToken as admin.auth.DecodedIdToken;

    // Get the correct team
    const invite = await database
      .collection("invite")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (invite.empty) {
      ctx.body = error(
        "invite.invalid.code",
        "Invalid invite code. Check your link"
      );
      return;
    }
    const team = invite.docs[0].id;

    return addUserToTeam(decodedToken.uid, team, ctx);
  });
};

async function addUserToTeam(
  uid: string,
  team: string,
  ctx: Router.IRouterContext
) {
  // First add them to the team directly
  const teamRef = admin
      .firestore()
      .collection("teams")
      .doc(team),
    snapshot = await teamRef.get();

  // See if the team is claimed
  if (!snapshot.exists) {
    return error(
      "invite.invalid.team",
      "That team hasn't been claimed yet, or is unavailable for other reasons"
    );
  }

  // Check if the team already has that member
  const data = snapshot.data() as FirebaseFirestore.DocumentData;
  if (data.members.includes(uid)) {
    return error(
      "invite.invalid.user",
      "User already part of this team. This is a no-op"
    );
  }

  // Finally, push the user to the end of the team
  return (
    teamRef
      .update({
        members: [...data.members, uid]
      })
      // Create action summary
      .then(() => ({
        error: null,
        action: {
          "invite.member_add": uid,
          "invite.team": team
        }
      }))
      .catch(() => {
        ctx.status = 500;
        return error(
          "invite.internal",
          "Internal Server Error. Try again in a little bit"
        );
      })
  );
}
