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
    final rawArea = json['area'];
    final areaName = rawArea is Map<String, dynamic>
        ? (rawArea['name'] as String? ?? 'Sin área')
        : (rawArea as String? ?? 'Sin área');

    return Visit(
      id: json['id'] as int? ?? 0,
      client: json['client'] as String? ?? 'Sin cliente',
      branch: json['branch'] as String? ?? 'Sin sucursal',
      area: areaName,
      visitedAt: json['visited_at'] as String? ?? '',
      inspector: json['inspector'] as String? ?? 'Sin inspector',
      status: json['status'] as String? ?? 'unknown',
      areaDispensersCount: _readAreaDispensersCount(json),
    );
  }

  static int _readAreaDispensersCount(Map<String, dynamic> json) {
    final rawValue = _readFirstNotNull(
      json,
      const [
        'area_dispensers_count',
        'area_dispencers_count',
        'dispensers_count',
        'area_dispenses_count',
      ],
    );

    final directValue = _asInt(rawValue);
    if (directValue != null) {
      return directValue;
    }

    final rawArea = json['area'];
    if (rawArea is Map<String, dynamic>) {
      final areaValue = _readFirstNotNull(
        rawArea,
        const [
          'dispensers_count',
          'area_dispensers_count',
          'area_dispencers_count',
          'dispenser_count',
        ],
      );
      final nestedValue = _asInt(areaValue);
      if (nestedValue != null) {
        return nestedValue;
      }

      final dispensers = rawArea['dispensers'];
      if (dispensers is List) {
        return dispensers.length;
      }
    }

    return 0;
  }

  static Object? _readFirstNotNull(Map<String, dynamic> source, List<String> keys) {
    for (final key in keys) {
      final value = source[key];
      if (value != null) {
        return value;
      }
    }
    return null;
  }

  static int? _asInt(Object? rawValue) {
    if (rawValue is int) {
      return rawValue;
    }
    if (rawValue is num) {
      return rawValue.toInt();
    }
    if (rawValue is String) {
      return int.tryParse(rawValue);
    }
    return null;
  }
}
