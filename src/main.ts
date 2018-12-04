import Koa from "koa";
import Router from "koa-router";
import admin from "firebase-admin";
const serviceAccount = require("../credentials/firebase.json");

import endpoints from "./endpoints";
import error from "./error";

const app = new Koa();
const router = new Router();

async function initalize() {
  admin.firestore().settings({ timestampsInSnapshots: true });

  endpoints.invite(router, app);

  app.use(router.routes()).use(router.allowedMethods());

  // 404 Message
  app.use(ctx => {
    ctx.status = 400;
    ctx.body = error("general.unknown_endpoint", "Unknown Endpoint");
  });

  app.listen(process.env.PORT || 3000, () => console.log("Server Active"));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
  databaseURL: "https://mannrobo-scout.firebaseio.com"
});

initalize();
