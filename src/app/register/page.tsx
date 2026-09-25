import { redirect } from "next/navigation";

/** Register is folded into login (auto-create on unknown nickname). */
export default function RegisterPage() {
  redirect("/login");
}
