/**
 * Simplified user view for e-voting system.
 * No reputation or decay calculations needed.
 */
function toSafeUser(user) {
  const plain = user?.toObject ? user.toObject() : { ...user };
  // Remove sensitive fields
  delete plain.passwordHash;
  return plain;
}

module.exports = { toSafeUser };
