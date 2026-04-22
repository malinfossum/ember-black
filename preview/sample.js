// users.js — small user list helpers

const ROLES = ["admin", "editor", "viewer"];
const DEFAULT_ROLE = "viewer";

/** Create a new user record. */
export function createUser(name, role = DEFAULT_ROLE) {
	if (!name) throw new Error("Name is required");
	if (!ROLES.includes(role)) {
		return { name, role: DEFAULT_ROLE, createdAt: Date.now() };
	}
	return { name, role, createdAt: Date.now() };
}

export function filterByRole(users, role) {
	return users.filter((u) => u.role === role);
}

const users = [
	createUser("Ada", "admin"),
	createUser("Linus", "editor"),
	createUser("Grace"),
];
const admins = filterByRole(users, "admin");
console.log(`Found ${admins.length} admin(s)`);
