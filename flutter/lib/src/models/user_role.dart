enum UserRole { inspector, other }

extension UserRoleParsing on UserRole {
  static UserRole fromEmail(String email) {
    final normalized = email.toLowerCase();
    return normalized.contains('inspector') ? UserRole.inspector : UserRole.other;
  }

  bool get isInspector => this == UserRole.inspector;
}
