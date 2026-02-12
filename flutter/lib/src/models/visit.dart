class Visit {
  const Visit({
    required this.id,
    required this.client,
    required this.branch,
    required this.area,
    required this.visitedAt,
    required this.inspector,
    required this.status,
    required this.areaDispensersCount,
  });

  final int id;
  final String client;
  final String branch;
  final String area;
  final String visitedAt;
  final String inspector;
  final String status;
  final int areaDispensersCount;

  factory Visit.fromJson(Map<String, dynamic> json) {
    return Visit(
      id: json['id'] as int? ?? 0,
      client: json['client'] as String? ?? 'Sin cliente',
      branch: json['branch'] as String? ?? 'Sin sucursal',
      area: json['area'] as String? ?? 'Sin área',
      visitedAt: json['visited_at'] as String? ?? '',
      inspector: json['inspector'] as String? ?? 'Sin inspector',
      status: json['status'] as String? ?? 'unknown',
      areaDispensersCount: _readAreaDispensersCount(json),
    );
  }

  static int _readAreaDispensersCount(Map<String, dynamic> json) {
    final rawValue = json['area_dispensers_count'] ?? json['dispensers_count'] ?? json['area_dispenses_count'];
    if (rawValue is int) {
      return rawValue;
    }
    if (rawValue is String) {
      return int.tryParse(rawValue) ?? 0;
    }
    return 0;
  }
}
