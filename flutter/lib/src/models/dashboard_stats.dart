class DashboardStats {
  const DashboardStats({
    required this.clients,
    required this.branches,
    required this.areas,
    required this.dispensers,
    required this.products,
    required this.visits,
    required this.incidents,
    required this.pendingVisits,
  });

  final int clients;
  final int branches;
  final int areas;
  final int dispensers;
  final int products;
  final int visits;
  final int incidents;
  final int pendingVisits;

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      clients: json['clients'] as int? ?? 0,
      branches: json['branches'] as int? ?? 0,
      areas: json['areas'] as int? ?? 0,
      dispensers: json['dispensers'] as int? ?? 0,
      products: json['products'] as int? ?? 0,
      visits: json['visits'] as int? ?? 0,
      incidents: json['incidents'] as int? ?? 0,
      pendingVisits: json['pending_visits'] as int? ?? 0,
    );
  }
}
