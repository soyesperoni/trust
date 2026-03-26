import 'package:flutter/material.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class DashboardQuickSetupScreen extends StatefulWidget {
  const DashboardQuickSetupScreen({
    required this.email,
    super.key,
  });

  final String email;

  @override
  State<DashboardQuickSetupScreen> createState() => _DashboardQuickSetupScreenState();
}

class _DashboardQuickSetupScreenState extends State<DashboardQuickSetupScreen> {
  final TrustRepository _repository = TrustRepository();

  int _step = 0;
  bool _loadingCatalogs = true;
  bool _saving = false;
  String? _error;

  final TextEditingController _clientNameController = TextEditingController();
  final TextEditingController _clientCodeController = TextEditingController();
  final TextEditingController _clientNotesController = TextEditingController();

  final TextEditingController _branchNameController = TextEditingController();
  final TextEditingController _branchAddressController = TextEditingController();
  final TextEditingController _branchCityController = TextEditingController();

  final TextEditingController _areaNameController = TextEditingController();
  final TextEditingController _areaDescriptionController = TextEditingController();

  int? _createdClientId;
  String? _createdClientName;

  final List<Map<String, dynamic>> _createdBranches = [];
  final List<Map<String, dynamic>> _createdAreas = [];
  final List<Map<String, dynamic>> _createdDispensers = [];

  int? _selectedBranchId;
  int? _selectedAreaId;

  int? _dispenserModelId;
  final Set<int> _selectedProductIds = <int>{};

  List<Map<String, dynamic>> _dispenserModels = const [];
  List<Map<String, dynamic>> _products = const [];

  static const _primaryColor = AppColors.secondary;
  static const _textSecondary = Color(0xFF64748B);

  @override
  void initState() {
    super.initState();
    _loadCatalogs();
  }

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientCodeController.dispose();
    _clientNotesController.dispose();
    _branchNameController.dispose();
    _branchAddressController.dispose();
    _branchCityController.dispose();
    _areaNameController.dispose();
    _areaDescriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadCatalogs() async {
    setState(() {
      _loadingCatalogs = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repository.loadDispenserModels(widget.email),
        _repository.loadProducts(widget.email),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        _dispenserModels = results[0];
        _products = results[1];
        _loadingCatalogs = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
        _loadingCatalogs = false;
      });
    }
  }

  InputDecoration _mobileInputDecoration(BuildContext context, String label) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: isDark ? AppColors.darkMuted : const Color(0xFF334155), fontWeight: FontWeight.w600),
      filled: true,
      fillColor: isDark ? AppColors.darkCard : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _primaryColor, width: 1.8),
      ),
    );
  }

  bool get _canContinue {
    switch (_step) {
      case 0:
        return _createdClientId != null;
      case 1:
        return _createdBranches.isNotEmpty;
      case 2:
        return _createdAreas.isNotEmpty;
      default:
        return _createdDispensers.isNotEmpty;
    }
  }

  Future<void> _createClient() async {
    final name = _clientNameController.text.trim();
    final code = _clientCodeController.text.trim();
    if (name.isEmpty || code.isEmpty) {
      setState(() => _error = 'Completa nombre y código del cliente.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final client = await _repository.createClient(
        email: widget.email,
        name: name,
        code: code,
        notes: _clientNotesController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _createdClientId = client['id'] as int?;
        _createdClientName = client['name'] as String?;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Cliente ${_createdClientName ?? ''} creado.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _createBranch() async {
    if (_createdClientId == null) {
      setState(() => _error = 'Primero crea el cliente.');
      return;
    }
    final name = _branchNameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'El nombre de sucursal es obligatorio.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final branch = await _repository.createBranch(
        email: widget.email,
        clientId: _createdClientId!,
        name: name,
        address: _branchAddressController.text.trim(),
        city: _branchCityController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _createdBranches.add(branch);
        _selectedBranchId ??= branch['id'] as int?;
        _branchNameController.clear();
        _branchAddressController.clear();
        _branchCityController.clear();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _createArea() async {
    if (_selectedBranchId == null) {
      setState(() => _error = 'Selecciona una sucursal.');
      return;
    }
    final name = _areaNameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'El nombre del área es obligatorio.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final area = await _repository.createArea(
        email: widget.email,
        branchId: _selectedBranchId!,
        name: name,
        description: _areaDescriptionController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _createdAreas.add(area);
        _selectedAreaId ??= area['id'] as int?;
        _areaNameController.clear();
        _areaDescriptionController.clear();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _createDispenser() async {
    if (_selectedAreaId == null || _dispenserModelId == null) {
      setState(() => _error = 'Selecciona área y modelo de dosificador.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final dispenser = await _repository.createDispenser(
        email: widget.email,
        areaId: _selectedAreaId!,
        modelId: _dispenserModelId!,
        productIds: _selectedProductIds.toList(growable: false),
      );
      if (!mounted) return;
      setState(() {
        _createdDispensers.add(dispenser);
        _selectedProductIds.clear();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final progressValue = (_step + 1) / 4;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: _loadingCatalogs
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Paso ${_step + 1} de 4',
                                style: const TextStyle(
                                  color: _primaryColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              Text(
                                '${(progressValue * 100).round()}%',
                                style: TextStyle(color: isDark ? AppColors.darkMuted : _textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: progressValue,
                              minHeight: 6,
                              backgroundColor: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
                              valueColor: const AlwaysStoppedAnimation<Color>(_primaryColor),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Alta rápida de cliente y estructura',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 12),
                          if (_error != null)
                            Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
                            ),
                          Expanded(child: _buildStep(isDark)),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0))),
                    ),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _saving
                                ? null
                                : () {
                                    if (_step == 0) {
                                      Navigator.of(context).pop();
                                      return;
                                    }
                                    setState(() => _step -= 1);
                                  },
                            child: Text(_step == 0 ? 'Cerrar' : 'Atrás'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            onPressed: !_canContinue || _saving
                                ? null
                                : () {
                                    if (_step < 3) {
                                      setState(() => _step += 1);
                                    } else {
                                      Navigator.of(context).pop(true);
                                    }
                                  },
                            child: Text(_step < 3 ? 'Siguiente' : 'Finalizar flujo'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildStep(bool isDark) {
    switch (_step) {
      case 0:
        return ListView(
          children: [
            TextField(
              controller: _clientNameController,
              decoration: _mobileInputDecoration(context, 'Nombre de cliente'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _clientCodeController,
              decoration: _mobileInputDecoration(context, 'Código'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _clientNotesController,
              maxLines: 3,
              decoration: _mobileInputDecoration(context, 'Notas (opcional)'),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _saving ? null : _createClient,
              icon: const Icon(Icons.add_business_rounded),
              label: Text(_createdClientId == null ? 'Crear cliente' : 'Cliente creado'),
            ),
            if (_createdClientName != null) ...[
              const SizedBox(height: 10),
              Text('Cliente actual: $_createdClientName', style: TextStyle(color: isDark ? AppColors.darkMuted : _textSecondary)),
            ],
          ],
        );
      case 1:
        return ListView(
          children: [
            TextField(controller: _branchNameController, decoration: _mobileInputDecoration(context, 'Nombre de sucursal')),
            const SizedBox(height: 10),
            TextField(controller: _branchAddressController, decoration: _mobileInputDecoration(context, 'Dirección')),
            const SizedBox(height: 10),
            TextField(controller: _branchCityController, decoration: _mobileInputDecoration(context, 'Ciudad')),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _saving ? null : _createBranch,
              icon: const Icon(Icons.storefront_rounded),
              label: const Text('Agregar sucursal'),
            ),
            const SizedBox(height: 12),
            ..._createdBranches.map(
              (branch) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.check_circle, color: Colors.green),
                title: Text(branch['name'] as String? ?? 'Sucursal'),
                subtitle: Text(branch['city'] as String? ?? ''),
              ),
            ),
          ],
        );
      case 2:
        return ListView(
          children: [
            DropdownButtonFormField<int>(
              value: _selectedBranchId,
              decoration: _mobileInputDecoration(context, 'Sucursal'),
              items: _createdBranches
                  .map(
                    (branch) => DropdownMenuItem<int>(
                      value: branch['id'] as int?,
                      child: Text(branch['name'] as String? ?? 'Sucursal'),
                    ),
                  )
                  .toList(growable: false),
              onChanged: _saving ? null : (value) => setState(() => _selectedBranchId = value),
            ),
            const SizedBox(height: 10),
            TextField(controller: _areaNameController, decoration: _mobileInputDecoration(context, 'Nombre del área')),
            const SizedBox(height: 10),
            TextField(
              controller: _areaDescriptionController,
              maxLines: 2,
              decoration: _mobileInputDecoration(context, 'Descripción (opcional)'),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _saving ? null : _createArea,
              icon: const Icon(Icons.grid_view_rounded),
              label: const Text('Agregar área'),
            ),
            const SizedBox(height: 12),
            ..._createdAreas.map(
              (area) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.check_circle, color: Colors.green),
                title: Text(area['name'] as String? ?? 'Área'),
              ),
            ),
          ],
        );
      default:
        return ListView(
          children: [
            DropdownButtonFormField<int>(
              value: _selectedAreaId,
              decoration: _mobileInputDecoration(context, 'Área'),
              items: _createdAreas
                  .map(
                    (area) => DropdownMenuItem<int>(
                      value: area['id'] as int?,
                      child: Text(area['name'] as String? ?? 'Área'),
                    ),
                  )
                  .toList(growable: false),
              onChanged: _saving ? null : (value) => setState(() => _selectedAreaId = value),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<int>(
              value: _dispenserModelId,
              decoration: _mobileInputDecoration(context, 'Modelo de dosificador'),
              items: _dispenserModels
                  .map(
                    (model) => DropdownMenuItem<int>(
                      value: model['id'] as int?,
                      child: Text(model['name'] as String? ?? 'Modelo'),
                    ),
                  )
                  .toList(growable: false),
              onChanged: _saving ? null : (value) => setState(() => _dispenserModelId = value),
            ),
            const SizedBox(height: 10),
            Text('Productos asociados', style: TextStyle(color: isDark ? AppColors.darkMuted : _textSecondary, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _products
                  .map(
                    (product) {
                      final productId = product['id'] as int?;
                      if (productId == null) {
                        return const SizedBox.shrink();
                      }
                      return FilterChip(
                        label: Text(product['name'] as String? ?? 'Producto'),
                        selected: _selectedProductIds.contains(productId),
                        onSelected: _saving
                            ? null
                            : (selected) {
                                setState(() {
                                  if (selected) {
                                    _selectedProductIds.add(productId);
                                  } else {
                                    _selectedProductIds.remove(productId);
                                  }
                                });
                              },
                      );
                    },
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _saving ? null : _createDispenser,
              icon: const Icon(Icons.local_gas_station_rounded),
              label: const Text('Agregar dosificador'),
            ),
            const SizedBox(height: 12),
            ..._createdDispensers.map(
              (dispenser) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.check_circle, color: Colors.green),
                title: Text(dispenser['identifier'] as String? ?? 'Dosificador'),
              ),
            ),
          ],
        );
    }
  }
}
