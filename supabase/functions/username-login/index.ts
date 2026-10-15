import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createUsernameLoginHandler } from "./handler.ts";

Deno.serve(createUsernameLoginHandler(createClient, (name) => Deno.env.get(name)));
