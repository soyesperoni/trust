import 'package:flutter/material.dart';

import '../../models/incident.dart';
import '../../models/user_role.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';

class ScheduleVisitFromIncidentScreen extends StatefulWidget {
  const ScheduleVisitFromIncidentScreen({
    required this.email,
    required this.incident,
    super.key,
  });

  final String email;
  final Incident incident;

  @override
  State<ScheduleVisitFromIncidentScreen> createState() => _ScheduleVisitFromIncidentScreenState();
}

class _ScheduleVisitFromIncidentScreenState extends State<ScheduleVisitFromIncidentScreen> {
  final TrustRepository _repository = TrustRepository();
  final TextEditingController _notesController = TextEditingController();

  List<Map<String, dynamic>> _inspectors = const [];
  int? _inspectorId;
  DateTime _selectedDateTime = DateTime.now();
  bool _loading = true;
  bool _isCurrentUserInspector = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFormData();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadFormData() async {
    try {
      final responses = await Future.wait([
        _repository.loadInspectors(widget.email),
        _repository.loadCurrentUser(widget.email),
      ]);
      if (!mounted) return;

      final inspectors = responses[0] as List<Map<String, dynamic>>;
      final currentUser = responses[1] as Map<String, dynamic>;
      final role = UserRoleParsing.fromBackendRole(currentUser['role'] as String?);

      setState(() {
        _inspectors = inspectors;
        _isCurrentUserInspector = role == UserRole.inspector;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDateTime,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_selectedDateTime),
    );
    if (time == null || !mounted) return;

    setState(() {
      _selectedDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _submit() async {
    if (!_isCurrentUserInspector && _inspectorId == null) {
      setState(() => _error = 'Seleccione un inspector.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await _repository.scheduleVisitFromIncident(
        email: widget.email,
        incidentId: widget.incident.id,
        inspectorId: _inspectorId,
        visitedAt: _selectedDateTime,
        notes: _notesController.text.trim(),
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Visita programada correctamente.')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Programar visita')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_error != null)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(_error!, style: TextStyle(color: isDark ? const Color(0xFFFCA5A5) : const Color(0xFFB91C1C))),
                    ),
                  _readonlyField(context, 'Cliente', widget.incident.client),
                  _readonlyField(context, 'Sucursal', widget.incident.branch),
                  _readonlyField(context, 'Área', widget.incident.area),
                  _readonlyField(context, 'Dosificador', widget.incident.dispenser),
                  const SizedBox(height: 8),
                  if (!_isCurrentUserInspector) ...[
                    DropdownButtonFormField<int>(
                      initialValue: _inspectorId,
                      decoration: _inputDecoration(context, 'Inspector'),
                      items: _inspectors
                          .map(
                            (inspector) => DropdownMenuItem<int>(
                              value: inspector['id'] as int?,
                              child: Text((inspector['full_name'] as String?) ?? 'Inspector'),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) => setState(() => _inspectorId = value),
                    ),
                    const SizedBox(height: 12),
                  ],
                  InkWell(
                    onTap: _pickDateTime,
                    child: InputDecorator(
                      decoration: _inputDecoration(context, 'Fecha y hora').copyWith(
                        suffixIcon: const Icon(Icons.event),
                      ),
                      child: Text(
                        '${_selectedDateTime.day.toString().padLeft(2, '0')}/${_selectedDateTime.month.toString().padLeft(2, '0')}/${_selectedDateTime.year} ${_selectedDateTime.hour.toString().padLeft(2, '0')}:${_selectedDateTime.minute.toString().padLeft(2, '0')}',
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notesController,
                    maxLines: 4,
                    decoration: _inputDecoration(context, 'Observaciones'),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.yellow,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Programando...' : 'Programar visita'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _readonlyField(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        enabled: false,
        initialValue: value,
        decoration: _inputDecoration(context, label),
      ),
    );
  }

  InputDecoration _inputDecoration(BuildContext context, String label) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: isDark ? AppColors.darkCard : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}
