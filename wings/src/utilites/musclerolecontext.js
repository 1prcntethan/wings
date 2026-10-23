import { createContext, useContext } from "react";

export const MuscleRoleContext = createContext(null);

export function useMuscleRoles() {
  return useContext(MuscleRoleContext);
}

export function skillButtonClass(roles, name) {
  if (!roles) return "skill-button";
  if (roles.primary.includes(name)) return "skill-button skill-button--primary";
  if (roles.secondary.includes(name)) return "skill-button skill-button--secondary";
  if (roles.stabilizer.includes(name)) return "skill-button skill-button--stabilizer";
  return "skill-button skill-button--dim";
}
