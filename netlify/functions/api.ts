import serverless from "serverless-http";
import { createNetlifyApp } from "../../server/netlify-app";

export const handler = serverless(createNetlifyApp());
