import 'package:flutter/material.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class DispenserFormScreen extends StatefulWidget {
  const DispenserFormScreen({
    required this.email,
    this.existingDispenser,
    required this.areas,
    required this.dispenserModels,
    required this.products,
    required this.nozzles,
    super.key,
  });

  final String email;
  final Map<String, dynamic>? existingDispenser;
  final List<Map<String, dynamic>> areas;
  final List<Map<String, dynamic>> dispenserModels;
  final List<Map<String, dynamic>> products;
  final List<Map<String, dynamic>> nozzles;

  @override
  State<DispenserFormScreen> createState() => _DispenserFormScreenState();
}

class _DispenserFormScreenState extends State<DispenserFormScreen> {
  final TrustRepository _repository = TrustRepository();
  final _formKey = GlobalKey<FormState>();

  late int _selectedAreaId;
  late int _selectedModelId;
  late List<int> _selectedProductIds;
  final Map<int, int?> _selectedNozzleIds = {}; // Maps product_id -> nozzle_id

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final dispenser = widget.existingDispenser;

    if (widget.areas.isNotEmpty) {
      _selectedAreaId = dispenser?['area']?['id'] as int? ?? widget.areas.first['id'] as int;
    }
    if (widget.dispenserModels.isNotEmpty) {
      _selectedModelId = dispenser?['model']?['id'] as int? ?? widget.dispenserModels.first['id'] as int;
    }

    _selectedProductIds = dispenser != null
        ? (dispenser['products'] as List<dynamic>? ?? []).map((p) => p['id'] as int).toList()
        : [];

    if (dispenser != null) {
      final prods = dispenser['products'] as List<dynamic>? ?? [];
      for (final p in prods) {
        final pid = p['id'] as int;
        final nozzle = p['nozzle'];
        if (nozzle != null) {
          _selectedNozzleIds[pid] = nozzle['id'] as int;
        }
      }
    }
  }

  Future<void> _save() async {
    if (widget.areas.isEmpty || widget.dispenserModels.isEmpty) return;
    if (!_formKey.currentState!.validate()) return;

    // Enforce that a boquilla (nozzle) is selected for each product
    for (final pid in _selectedProductIds) {
      if (_selectedNozzleIds[pid] == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Debes seleccionar una boquilla para cada producto activado.'),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
    }

    setState(() => _isSaving = true);

    final assignments = _selectedProductIds.map((pid) {
      return {
        'product_id': pid,
        'nozzle_id': _selectedNozzleIds[pid],
      };
    }).toList();

    try {
      final isEdit = widget.existingDispenser != null;
      if (isEdit) {
        await _repository.updateDispenser(
          email: widget.email,
          dispenserId: widget.existingDispenser!['id'] as int,
          body: {
            'area_id': _selectedAreaId,
            'model_id': _selectedModelId,
            'product_assignments': assignments,
          },
        );
      } else {
        await _repository.createDispenser(
          email: widget.email,
          areaId: _selectedAreaId,
          modelId: _selectedModelId,
          productAssignments: assignments,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _isSaving = false);
      final errorMsg = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMsg),
          backgroundColor: AppColors.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEdit = widget.existingDispenser != null;

    final hasRequiredCatalogs = widget.areas.isNotEmpty && widget.dispenserModels.isNotEmpty;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Dosificador' : 'Crear Dosificador'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            TextButton(
              onPressed: _save,
              child: Text(
                'Guardar',
                style: TextStyle(
                  color: isDark ? AppColors.yellow : AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
        ],
      ),
      body: !hasRequiredCatalogs
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 64, color: Colors.orange),
                    const SizedBox(height: 16),
                    const Text(
                      'Debes tener al menos un Área y un Modelo de Dosificador creados.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                      child: const Text('Volver'),
                    ),
                  ],
                ),
              ),
            )
          : GestureDetector(
              onTap: () => FocusScope.of(context).unfocus(),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSectionTitle('Información del Dosificador'),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<int>(
                        value: _selectedAreaId,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Área (Ubicación)',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: widget.areas.map((a) {
                          return DropdownMenuItem<int>(
                            value: a['id'] as int,
                            child: Text(
                              '${a['name']} (${a['branch']?['name'] ?? ''})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _selectedAreaId = v);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<int>(
                        value: _selectedModelId,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Modelo de Dosificador',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: widget.dispenserModels.map((m) {
                          return DropdownMenuItem<int>(
                            value: m['id'] as int,
                            child: Text(
                              m['name'] as String? ?? '',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _selectedModelId = v);
                          }
                        },
                      ),
                      const SizedBox(height: 28),
                      _buildSectionTitle('Productos y Boquillas Asignados'),
                      const SizedBox(height: 8),
                      if (widget.products.isEmpty)
                        const Text('No hay productos creados en el catálogo.')
                      else
                        ...widget.products.map((p) {
                          final pid = p['id'] as int;
                          final isSel = _selectedProductIds.contains(pid);

                          // Set a default nozzle if none selected and nozzles are available
                          if (isSel && _selectedNozzleIds[pid] == null && widget.nozzles.isNotEmpty) {
                            _selectedNozzleIds[pid] = widget.nozzles.first['id'] as int;
                          }

                          return Card(
                            elevation: 0,
                            margin: const EdgeInsets.only(bottom: 12),
                            color: isDark ? AppColors.darkSurface : AppColors.gray50,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CheckboxListTile(
                                    title: Text(
                                      p['name'] as String? ?? '',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    subtitle: Text(p['description'] as String? ?? 'Sin descripción'),
                                    value: isSel,
                                    activeColor: AppColors.primary,
                                    contentPadding: EdgeInsets.zero,
                                    onChanged: (v) {
                                      setState(() {
                                        if (v == true) {
                                          _selectedProductIds.add(pid);
                                          if (_selectedNozzleIds[pid] == null && widget.nozzles.isNotEmpty) {
                                            _selectedNozzleIds[pid] = widget.nozzles.first['id'] as int;
                                          }
                                        } else {
                                          _selectedProductIds.remove(pid);
                                        }
                                      });
                                    },
                                  ),
                                  if (isSel) ...[
                                    const Divider(height: 16),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Boquilla',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 8),
                                    DropdownButtonFormField<int>(
                                      value: _selectedNozzleIds[pid],
                                      isExpanded: true,
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: isDark ? AppColors.darkBackground : Colors.white,
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      items: widget.nozzles.map((n) {
                                        return DropdownMenuItem<int>(
                                          value: n['id'] as int,
                                          child: Text(
                                            n['name'] as String? ?? '',
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (v) {
                                        if (v != null) {
                                          setState(() => _selectedNozzleIds[pid] = v);
                                        }
                                      },
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        }),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}
