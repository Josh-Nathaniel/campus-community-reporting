/**
 * AUTHENTICATION MODULE (Auth.gs)
 * Project: Campus Community Reporting System
 * Role: Handles user registration, authentication verification, and user management.
 */

/**
 * Handles new user account registration.
 * @param {Object} data - { name, email, password, role }
 * @returns {Object} Newly created user profile (without password_hash)
 */
function handleRegister(data) {
  if (!data) throw new Error("Registration payload is required.");

  var name = String(data.name || "").trim();
  var email = String(data.email || "").trim().toLowerCase();
  var password = String(data.password || "");
  var role = String(data.role || "student").trim().toLowerCase();

  // Validate fields
  if (!name || name.length < 2) {
    throw new Error("Full name is required (minimum 2 characters).");
  }
  if (!isValidEmail(email)) {
    throw new Error("A valid email address is required.");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (role !== "student" && role !== "admin") {
    role = "student"; // Default fallback
  }

  // Check email uniqueness
  var users = getRowsAsObjects("Users");
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].email).trim().toLowerCase() === email) {
      throw new Error("An account with this email address already exists.");
    }
  }

  // Create user record
  var userId = generateId("USR");
  var passwordHash = hashPassword(password);
  var createdAt = new Date().toISOString();

  var newRecord = {
    id: userId,
    name: sanitizeInput(name),
    email: email,
    password_hash: passwordHash,
    role: role,
    created_at: createdAt
  };

  appendRecord("Users", newRecord);

  // Return safe user object (omit password_hash)
  return {
    id: userId,
    name: newRecord.name,
    email: newRecord.email,
    role: newRecord.role,
    created_at: newRecord.created_at
  };
}

/**
 * Handles user login authentication.
 * @param {Object} data - { email, password }
 * @returns {Object} Authenticated user profile (without password_hash)
 */
function handleLogin(data) {
  if (!data) throw new Error("Login credentials are required.");

  var email = String(data.email || "").trim().toLowerCase();
  var password = String(data.password || "");

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  var users = getRowsAsObjects("Users");
  var matchedUser = null;

  for (var i = 0; i < users.length; i++) {
    if (String(users[i].email).trim().toLowerCase() === email) {
      matchedUser = users[i];
      break;
    }
  }

  if (!matchedUser) {
    throw new Error("Invalid email or password.");
  }

  // Verify hash
  var inputHash = hashPassword(password);
  if (inputHash !== matchedUser.password_hash) {
    throw new Error("Invalid email or password.");
  }

  // Return safe user object
  return {
    id: matchedUser.id,
    name: matchedUser.name,
    email: matchedUser.email,
    role: matchedUser.role,
    created_at: matchedUser.created_at
  };
}

/**
 * Retrieves all registered users for administrative viewing.
 * @param {string} adminUserId - ID of the requesting administrator
 * @returns {Array<Object>} List of safe user objects
 */
function handleGetUsers(adminUserId) {
  if (!adminUserId) {
    throw new Error("Administrator verification required.");
  }

  var adminLookup = findRowById("Users", adminUserId);
  if (!adminLookup || adminLookup.data.role !== "admin") {
    throw new Error("Unauthorized: Only administrators may view the user directory.");
  }

  var users = getRowsAsObjects("Users");
  var safeUsers = [];

  for (var i = 0; i < users.length; i++) {
    safeUsers.push({
      id: users[i].id,
      name: users[i].name,
      email: users[i].email,
      role: users[i].role,
      created_at: users[i].created_at
    });
  }

  return safeUsers;
}
