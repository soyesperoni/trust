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
    super.key,
  });

  final String email;
  final Map<String, dynamic>? existingDispenser;
  final List<Map<String, dynamic>> areas;
  final List<Map<String, dynamic>> dispenserModels;
  final List<Map<String, dynamic>> products;

  @override
  State<DispenserFormScreen> createState() => _DispenserFormScreenState();
}

class _DispenserFormScreenState extends State<DispenserFormScreen> {
  final TrustRepository _repository = TrustRepository();
  final _formKey = GlobalKey<FormState>();

  late int _selectedAreaId;
  late int _selectedModelId;
  late List<int> _selectedProductIds;

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
  }

  Future<void> _save() async {
    if (widget.areas.isEmpty || widget.dispenserModels.isEmpty) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final isEdit = widget.existingDispenser != null;
      if (isEdit) {
        await _repository.updateDispenser(
          email: widget.email,
          dispenserId: widget.existingDispenser!['id'] as int,
          body: {
            'area_id': _selectedAreaId,
            'model_id': _selectedModelId,
            'product_ids': _selectedProductIds,
          },
        );
      } else {
        await _repository.createDispenser(
          email: widget.email,
          areaId: _selectedAreaId,
          modelId: _selectedModelId,
          productIds: _selectedProductIds,
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
                      _buildSectionTitle('Productos Asignados'),
                      const SizedBox(height: 8),
                      Card(
                        elevation: 0,
                        color: isDark ? AppColors.darkSurface : AppColors.gray50,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: widget.products.isEmpty
                              ? const Padding(
                                  padding: EdgeInsets.all(16.0),
                                  child: Text('No hay productos creados en el catálogo.'),
                                )
                              : Column(
                                  children: widget.products.map((p) {
                                    final pid = p['id'] as int;
                                    final isSel = _selectedProductIds.contains(pid);
                                    return CheckboxListTile(
                                      title: Text(p['name'] as String? ?? ''),
                                      subtitle: Text(p['description'] as String? ?? 'Sin descripción'),
                                      value: isSel,
                                      activeColor: AppColors.primary,
                                      onChanged: (v) {
                                        setState(() {
                                          if (v == true) {
                                            _selectedProductIds.add(pid);
                                          } else {
                                            _selectedProductIds.remove(pid);
                                          }
                                        });
                                      },
                                    );
                                  }).toList(),
                                ),
                        ),
                      ),
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
