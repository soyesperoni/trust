import 'package:flutter/material.dart';

import '../../models/audit.dart';
import '../audit_execution_screen.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';

class StartAuditScreen extends StatefulWidget {
  const StartAuditScreen({required this.email, super.key});

  final String email;

  @override
  State<StartAuditScreen> createState() => _StartAuditScreenState();
}

class _StartAuditScreenState extends State<StartAuditScreen> {
  final TrustRepository _repository = TrustRepository();

  bool _loading = true;
  bool _submitting = false;
  String? _error;

  List<Map<String, dynamic>> _clients = const [];
  List<Map<String, dynamic>> _branches = const [];
  List<Map<String, dynamic>> _areas = const [];

  int? _clientId;
  int? _branchId;
  int? _areaId;

  @override
  void initState() {
    super.initState();
    _loadCatalogs();
  }

  List<Map<String, dynamic>> get _filteredBranches => _branches
      .where((b) => _clientId == null || ((b['client'] as Map<String, dynamic>?)?['id'] as int?) == _clientId)
      .toList(growable: false);

  List<Map<String, dynamic>> get _filteredAreas => _areas
      .where((a) => _branchId == null || ((a['branch'] as Map<String, dynamic>?)?['id'] as int?) == _branchId)
      .toList(growable: false);

  Future<void> _loadCatalogs() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _repository.loadClients(widget.email),
        _repository.loadBranches(widget.email),
        _repository.loadAreas(widget.email),
      ]);

      if (!mounted) {
        return;
      }

      setState(() {
        _clients = results[0];
        _branches = results[1];
        _areas = results[2];
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _startAudit() async {
    if (_areaId == null) {
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final Audit audit = await _repository.createAudit(
        email: widget.email,
        areaId: _areaId!,
      );

      if (!mounted) {
        return;
      }

      final started = await Navigator.of(context).push<bool>(
        MaterialPageRoute<bool>(
          builder: (_) => AuditExecutionScreen(
            audit: audit,
            email: widget.email,
          ),
        ),
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(started == true);
    } catch (error) {
      if (!mounted) {
        return;
      }
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
      appBar: AppBar(title: const Text('Iniciar auditoría')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Selecciona marca, sucursal y área para comenzar la auditoría.',
                    style: TextStyle(
                      color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    value: _clientId,
                    isExpanded: true,
                    decoration: _inputDecoration(context, 'Marca'),
                    items: _clients
                        .map(
                          (client) => DropdownMenuItem<int>(
                            value: client['id'] as int?,
                            child: Text((client['name'] as String?) ?? 'Cliente ${client['id']}'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _clientId = value;
                        _branchId = null;
                        _areaId = null;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    value: _branchId,
                    isExpanded: true,
                    decoration: _inputDecoration(context, 'Sucursal'),
                    items: _filteredBranches
                        .map(
                          (branch) => DropdownMenuItem<int>(
                            value: branch['id'] as int?,
                            child: Text((branch['name'] as String?) ?? 'Sucursal ${branch['id']}'),
                          ),
                        )
                        .toList(),
                    onChanged: _clientId == null
                        ? null
                        : (value) {
                            setState(() {
                              _branchId = value;
                              _areaId = null;
                            });
                          },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    value: _areaId,
                    isExpanded: true,
                    decoration: _inputDecoration(context, 'Área'),
                    items: _filteredAreas
                        .map(
                          (area) => DropdownMenuItem<int>(
                            value: area['id'] as int?,
                            child: Text((area['name'] as String?) ?? 'Área ${area['id']}'),
                          ),
                        )
                        .toList(),
                    onChanged: _branchId == null ? null : (value) => setState(() => _areaId = value),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      _error!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: (_areaId == null || _submitting) ? null : _startAudit,
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: Text(_submitting ? 'Iniciando...' : 'Comenzar auditoría'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.yellow,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
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
        borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
      ),
    );
  }
}
