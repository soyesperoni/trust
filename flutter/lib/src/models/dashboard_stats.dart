class DashboardStats {
  const DashboardStats({
    required this.clients,
    required this.branches,
    required this.areas,
    required this.dispensers,
    required this.products,
    required this.visits,
    required this.completedVisits,
    required this.incidents,
    required this.pendingVisits,
    required this.overdueVisits,
    required this.audits,
    required this.completedAudits,
    required this.scheduledAudits,
    required this.overdueAudits,
    required this.complianceScore,
  });

  final int clients;
  final int branches;
  final int areas;
  final int dispensers;
  final int products;
  final int visits;
  final int completedVisits;
  final int incidents;
  final int pendingVisits;
  final int overdueVisits;
  final int audits;
  final int completedAudits;
  final int scheduledAudits;
  final int overdueAudits;
  final double complianceScore;

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      clients: json['clients'] as int? ?? 0,
      branches: json['branches'] as int? ?? 0,
      areas: json['areas'] as int? ?? 0,
      dispensers: json['dispensers'] as int? ?? 0,
      products: json['products'] as int? ?? 0,
      visits: json['visits'] as int? ?? 0,
      completedVisits: json['completed_visits'] as int? ?? 0,
      incidents: json['incidents'] as int? ?? 0,
      pendingVisits: json['pending_visits'] as int? ?? 0,
      overdueVisits: json['overdue_visits'] as int? ?? 0,
      audits: json['audits'] as int? ?? 0,
      completedAudits: json['completed_audits'] as int? ?? 0,
      scheduledAudits: json['scheduled_audits'] as int? ?? 0,
      overdueAudits: json['overdue_audits'] as int? ?? 0,
      complianceScore: (json['compliance_score'] as num?)?.toDouble() ??
          (json['audit_score'] as num?)?.toDouble() ??
          0,
    );
  }
}
