import express from "express";
import cors from "cors";
import routes from "./api/routes.js";
import { requireOperatorContext } from "./core/auth.js";
import { connectMongo } from "./core/mongo.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(requireOperatorContext);
app.use(routes);

async function start(): Promise<void> {
  await connectMongo();
  app.listen(port, () => {
    console.log(`API listening on ${port}`);
  });
}

void start();
